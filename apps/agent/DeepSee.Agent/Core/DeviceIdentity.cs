using System;
using System.IO;
using System.Security.Cryptography;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace DeepSee.Agent.Core;

public class DeviceIdentityData
{
    public string DeviceId { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string? DeviceJwt { get; set; }
    public string? OrgId { get; set; }
    public int CredentialVersion { get; set; } = 1;
    public DateTime CreatedAt { get; set; }
}

public class DeviceIdentity
{
    private readonly ILogger<DeviceIdentity> _logger;
    private static readonly string StorageDir = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.CommonApplicationData),
        "DeepSee");
    private static readonly string IdentityFilePath = Path.Combine(StorageDir, "identity.enc");

    private DeviceIdentityData? _data;

    public DeviceIdentity(ILogger<DeviceIdentity> logger)
    {
        _logger = logger;
    }

    public string DeviceId => _data?.DeviceId ?? string.Empty;
    public string PublicKey => _data?.PublicKey ?? string.Empty;
    public string? DeviceJwt => _data?.DeviceJwt;
    public string? OrgId => _data?.OrgId;
    public int CredentialVersion => _data?.CredentialVersion ?? 1;
    public DateTime? TokenExpiresAt
    {
        get
        {
            try
            {
                var parts = _data?.DeviceJwt?.Split('.');
                if (parts == null || parts.Length != 3) return null;
                var payload = parts[1].Replace('-', '+').Replace('_', '/');
                payload = payload.PadRight(payload.Length + ((4 - payload.Length % 4) % 4), '=');
                var claims = JObject.Parse(Encoding.UTF8.GetString(Convert.FromBase64String(payload)));
                var exp = claims.Value<long?>("exp");
                return exp.HasValue ? DateTimeOffset.FromUnixTimeSeconds(exp.Value).UtcDateTime : null;
            }
            catch { return null; }
        }
    }
    public bool IsEnrolled => !string.IsNullOrEmpty(_data?.DeviceJwt) && !string.IsNullOrEmpty(_data?.OrgId);

    public async Task InitializeAsync()
    {
        try
        {
            if (!Directory.Exists(StorageDir))
            {
                Directory.CreateDirectory(StorageDir);
            }
            RestrictStorageDirectory();

            if (File.Exists(IdentityFilePath))
            {
                var encryptedBytes = await File.ReadAllBytesAsync(IdentityFilePath);
                var decryptedBytes = ProtectedData.Unprotect(
                    encryptedBytes,
                    null,
                    DataProtectionScope.LocalMachine);

                var json = Encoding.UTF8.GetString(decryptedBytes);
                _data = JsonConvert.DeserializeObject<DeviceIdentityData>(json);
                RestrictIdentityFile();

                _logger.LogInformation("Loaded device identity. DeviceId: {DeviceId}, Enrolled: {IsEnrolled}",
                    _data?.DeviceId, IsEnrolled);
                return;
            }

            // Generate fresh RSA 2048 keypair for cryptographic endpoint authentication
            using var rsa = RSA.Create(2048);
            var pubKey = Convert.ToBase64String(rsa.ExportRSAPublicKey());
            var privKey = Convert.ToBase64String(rsa.ExportRSAPrivateKey());

            _data = new DeviceIdentityData
            {
                DeviceId = Guid.NewGuid().ToString(),
                PublicKey = pubKey,
                PrivateKey = privKey,
                CreatedAt = DateTime.UtcNow
            };

            await PersistAsync();
            RestrictIdentityFile();
            _logger.LogInformation("Generated and secured new device identity. DeviceId: {DeviceId}", _data.DeviceId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize cryptographic device identity");
            throw;
        }
    }

    public string SignEnrollmentProof(string code, string hostname, long timestamp, string nonce)
    {
        if (_data == null) throw new InvalidOperationException("DeviceIdentity is not initialized.");
        using var rsa = RSA.Create();
        rsa.ImportRSAPrivateKey(Convert.FromBase64String(_data.PrivateKey), out _);
        var canonical = $"{code.ToUpperInvariant()}\n{_data.DeviceId}\n{hostname.Trim()}\n{timestamp}\n{nonce.ToLowerInvariant()}";
        return Convert.ToBase64String(rsa.SignData(Encoding.UTF8.GetBytes(canonical), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
    }

    public string SignRotationProof(long timestamp, string nonce)
    {
        if (_data == null) throw new InvalidOperationException("DeviceIdentity is not initialized.");
        using var rsa = RSA.Create();
        rsa.ImportRSAPrivateKey(Convert.FromBase64String(_data.PrivateKey), out _);
        var canonical = $"POST\n/api/devices/credentials/rotate\n{_data.DeviceId}\n{timestamp}\n{nonce.ToLowerInvariant()}";
        return Convert.ToBase64String(rsa.SignData(Encoding.UTF8.GetBytes(canonical), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
    }

    public string SignRelayProof(long timestamp, string nonce)
    {
        if (_data == null) throw new InvalidOperationException("DeviceIdentity is not initialized.");
        using var rsa = RSA.Create();
        rsa.ImportRSAPrivateKey(Convert.FromBase64String(_data.PrivateKey), out _);
        var canonical = $"deepsee-relay-v1\n{_data.DeviceId}\n{timestamp}\n{nonce.ToLowerInvariant()}";
        return Convert.ToBase64String(rsa.SignData(Encoding.UTF8.GetBytes(canonical), HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
    }

    public async Task SaveJwtAsync(string jwt, string orgId, int credentialVersion = 1)
    {
        if (_data == null)
            throw new InvalidOperationException("DeviceIdentity is not initialized.");

        _data.DeviceJwt = jwt;
        _data.OrgId = orgId;
        _data.CredentialVersion = credentialVersion;
        await PersistAsync();
        _logger.LogInformation("Successfully saved enrollment credentials for OrgId: {OrgId}", orgId);
    }

    public async Task ClearJwtAsync()
    {
        if (_data != null)
        {
            _data.DeviceJwt = null;
            _data.OrgId = null;
            await PersistAsync();
            _logger.LogWarning("Device enrollment credentials cleared.");
        }
    }

    public string GenerateHardwareFingerprint()
    {
        var raw = $"{Environment.MachineName}-{Environment.ProcessorCount}-{Environment.OSVersion.VersionString}";
        using var sha = SHA256.Create();
        var hash = sha.ComputeHash(Encoding.UTF8.GetBytes(raw));
        return Convert.ToHexString(hash);
    }

    private async Task PersistAsync()
    {
        if (_data == null) return;
        var json = JsonConvert.SerializeObject(_data, Formatting.Indented);
        var bytes = Encoding.UTF8.GetBytes(json);
        var encrypted = ProtectedData.Protect(bytes, null, DataProtectionScope.LocalMachine);
        var temporaryPath = IdentityFilePath + ".tmp";
        await File.WriteAllBytesAsync(temporaryPath, encrypted);
        File.Move(temporaryPath, IdentityFilePath, overwrite: true);
    }

    private static void RestrictStorageDirectory()
    {
        var security = new DirectorySecurity();
        security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
        var inheritance = InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit;
        security.AddAccessRule(new FileSystemAccessRule(
            new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null),
            FileSystemRights.FullControl, inheritance, PropagationFlags.None, AccessControlType.Allow));
        security.AddAccessRule(new FileSystemAccessRule(
            new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null),
            FileSystemRights.FullControl, inheritance, PropagationFlags.None, AccessControlType.Allow));
        var serviceIdentity = WindowsIdentity.GetCurrent().User;
        if (serviceIdentity != null)
            security.AddAccessRule(new FileSystemAccessRule(serviceIdentity, FileSystemRights.FullControl, inheritance, PropagationFlags.None, AccessControlType.Allow));
        new DirectoryInfo(StorageDir).SetAccessControl(security);
    }

    private static void RestrictIdentityFile()
    {
        var security = new FileSecurity();
        security.SetAccessRuleProtection(isProtected: true, preserveInheritance: false);
        security.AddAccessRule(new FileSystemAccessRule(
            new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null),
            FileSystemRights.FullControl, AccessControlType.Allow));
        security.AddAccessRule(new FileSystemAccessRule(
            new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null),
            FileSystemRights.FullControl, AccessControlType.Allow));
        var serviceIdentity = WindowsIdentity.GetCurrent().User;
        if (serviceIdentity != null)
            security.AddAccessRule(new FileSystemAccessRule(serviceIdentity, FileSystemRights.FullControl, AccessControlType.Allow));
        new FileInfo(IdentityFilePath).SetAccessControl(security);
    }
}
