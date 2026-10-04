using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;

namespace DeepSee.Worker.Engines;

public record FileItem(string Name, string Path, bool IsDirectory, long SizeBytes, DateTime ModifiedAt);
public record DriveItem(string Name, string Label, long TotalBytes, long FreeBytes);

public class FileEngine
{
    public List<DriveItem> GetDrives()
    {
        return DriveInfo.GetDrives()
            .Where(d => d.IsReady)
            .Select(d => new DriveItem(
                d.Name,
                string.IsNullOrEmpty(d.VolumeLabel) ? d.DriveType.ToString() : d.VolumeLabel,
                d.TotalSize,
                d.AvailableFreeSpace))
            .ToList();
    }

    public List<FileItem> ListDirectory(string path)
    {
        var result = new List<FileItem>();
        if (!Directory.Exists(path)) return result;

        var dirInfo = new DirectoryInfo(path);

        foreach (var dir in dirInfo.GetDirectories())
        {
            result.Add(new FileItem(dir.Name, dir.FullName, true, 0, dir.LastWriteTimeUtc));
        }

        foreach (var file in dirInfo.GetFiles())
        {
            result.Add(new FileItem(file.Name, file.FullName, false, file.Length, file.LastWriteTimeUtc));
        }

        return result;
    }

    public byte[] ReadChunk(string path, long offset, int length)
    {
        using var fs = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        fs.Seek(offset, SeekOrigin.Begin);
        var buffer = new byte[length];
        int read = fs.Read(buffer, 0, length);
        if (read < length)
        {
            Array.Resize(ref buffer, read);
        }
        return buffer;
    }

    public void WriteChunk(string path, long offset, byte[] data)
    {
        using var fs = new FileStream(path, FileMode.OpenOrCreate, FileAccess.Write, FileShare.None);
        fs.Seek(offset, SeekOrigin.Begin);
        fs.Write(data, 0, data.Length);
    }

    public void Delete(string path)
    {
        if (Directory.Exists(path))
        {
            Directory.Delete(path, true);
        }
        else if (File.Exists(path))
        {
            File.Delete(path);
        }
    }

    public string CalculateSha256(string path)
    {
        using var sha = SHA256.Create();
        using var fs = File.OpenRead(path);
        var hash = sha.ComputeHash(fs);
        return Convert.ToHexString(hash);
    }
}
