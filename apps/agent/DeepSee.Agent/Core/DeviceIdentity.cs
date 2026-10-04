using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace DeepSee.Agent.Core;

public class DeviceIdentityData
{
    public string DeviceId { get; set; } = string.Empty;
    public string PublicKey { get; set; } = string.Empty;
    public string PrivateKey { get; set; } = string.Empty;
    public string? DeviceJwt { get; set; }
    public string? OrgId { get; set; }
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
    public bool IsEnrolled => !string.IsNullOrEmpty(_data?.DeviceJwt) && !string.IsNullOrEmpty(_data?.OrgId);

    public async Task InitializeAsync()
    {
        try
        {
            if (!Directory.Exists(StorageDir))
            {
                Directory.CreateDirectory(StorageDir);
            }

            if (File.Exists(IdentityFilePath))
            {
                var encryptedBytes = await File.ReadAllBytesAsync(IdentityFilePath);
                var decryptedBytes = ProtectedData.Unprotect(
                    encryptedBytes,
                    null,
                    DataProtectionScope.LocalMachine);

                var json = Encoding.UTF8.GetString(decryptedBytes);
                _data = JsonConvert.DeserializeObject<DeviceIdentityData>(json);

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
            _logger.LogInformation("Generated and secured new device identity. DeviceId: {DeviceId}", _data.DeviceId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize cryptographic device identity");
            throw;
        }
    }

    public async Task SaveJwtAsync(string jwt, string orgId)
    {
        if (_data == null)
            throw new InvalidOperationException("DeviceIdentity is not initialized.");

        _data.DeviceJwt = jwt;
        _data.OrgId = orgId;
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
        await File.WriteAllBytesAsync(IdentityFilePath, encrypted);
    }
}
