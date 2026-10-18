const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required to test tenant isolation.');
  const client = new Client({ connectionString });
  await client.connect();

  const firstUser = randomUUID();
  const secondUser = randomUUID();
  const firstOrg = randomUUID();
  const secondOrg = randomUUID();
  const firstDevice = randomUUID();
  const secondDevice = randomUUID();
  const marker = `rls-${randomUUID()}`;

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO organizations (id, name, slug) VALUES ($1, 'RLS test A', $2), ($3, 'RLS test B', $4)`,
      [firstOrg, `${marker}-a`, secondOrg, `${marker}-b`],
    );
    await client.query(
      `INSERT INTO memberships (org_id, user_id, role) VALUES ($1, $2, 'technician'), ($3, $4, 'owner')`,
      [firstOrg, firstUser, secondOrg, secondUser],
    );
    await client.query(
      `INSERT INTO devices (id, org_id, device_id, name) VALUES ($1, $2, $3, 'A'), ($4, $5, $6, 'B')`,
      [firstDevice, firstOrg, `${marker}-device-a`, secondDevice, secondOrg, `${marker}-device-b`],
    );

    await client.query('SET LOCAL ROLE authenticated');
    await client.query("SELECT set_config('request.jwt.claim.sub', $1, true)", [firstUser]);
    const visibleDevices = await client.query('SELECT id FROM devices');
    if (visibleDevices.rowCount !== 1 || visibleDevices.rows[0].id !== firstDevice) {
      throw new Error('Tenant isolation failed: user could read devices outside their tenant.');
    }

    const visibleMemberships = await client.query('SELECT org_id FROM memberships');
    if (visibleMemberships.rowCount !== 1 || visibleMemberships.rows[0].org_id !== firstOrg) {
      throw new Error('Membership isolation failed: user could read another tenant membership.');
    }

    const roleEscalation = await client.query(
      `UPDATE memberships SET role = 'owner' WHERE org_id = $1 AND user_id = $2`,
      [firstOrg, firstUser],
    );
    if (roleEscalation.rowCount !== 0) {
      throw new Error('Authorization failed: user could change their own membership role.');
    }

    const orgMutation = await client.query(
      `UPDATE organizations SET name = 'unauthorized edit' WHERE id = $1`,
      [firstOrg],
    );
    if (orgMutation.rowCount !== 0) {
      throw new Error('Authorization failed: technician could edit organization settings.');
    }

    async function assertDenied(label, sql, values) {
      await client.query('SAVEPOINT authorization_check');
      let caught;
      try {
        await client.query(sql, values);
      } catch (error) {
        caught = error;
      }
      await client.query('ROLLBACK TO SAVEPOINT authorization_check');
      await client.query('RELEASE SAVEPOINT authorization_check');
      if (!caught || caught.code !== '42501') {
        throw new Error(`Authorization failed: ${label} was allowed.`);
      }
    }

    await assertDenied(
      'audit-log forgery',
      `INSERT INTO audit_logs (org_id, user_id, action) VALUES ($1, $2, 'forged')`,
      [firstOrg, firstUser],
    );
    await assertDenied(
      'policy mutation by technician',
      `INSERT INTO policies (org_id, name, created_by) VALUES ($1, 'unauthorized', $2)`,
      [firstOrg, firstUser],
    );
    await assertDenied(
      'subscription plan mutation',
      `UPDATE organizations SET plan = 'enterprise' WHERE id = $1`,
      [firstOrg],
    );
    await assertDenied(
      'device identity mutation',
      `UPDATE devices SET device_id = 'forged-identity' WHERE id = $1`,
      [firstDevice],
    );

    let crossTenantInsertDenied = false;
    try {
      await client.query(
        `INSERT INTO devices (org_id, device_id, name) VALUES ($1, $2, 'forbidden')`,
        [secondOrg, `${marker}-forbidden`],
      );
    } catch (error) {
      if (error.code !== '42501') throw error;
      crossTenantInsertDenied = true;
    }
    if (!crossTenantInsertDenied) {
      throw new Error('Tenant isolation failed: user could insert a device into another tenant.');
    }
    await client.query('ROLLBACK');
    console.log('Database authorization checks passed (tenant reads, cross-tenant writes, role escalation, audit integrity, and policy scope).');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
