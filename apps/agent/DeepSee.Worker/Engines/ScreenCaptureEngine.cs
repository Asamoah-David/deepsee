using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using Serilog;

namespace DeepSee.Worker.Engines;

public record MonitorDetail(int Index, string Name, int Width, int Height, bool IsPrimary);

public class ScreenCaptureEngine
{
    private bool _isStreaming;
    private CancellationTokenSource? _streamingCts;

    [DllImport("user32.dll")]
    private static extern IntPtr GetDC(IntPtr hwnd);

    [DllImport("user32.dll")]
    private static extern int ReleaseDC(IntPtr hwnd, IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

    [DllImport("gdi32.dll")]
    private static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

    [DllImport("gdi32.dll")]
    private static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, int dwRop);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll")]
    private static extern bool DeleteObject(IntPtr hObject);

    [DllImport("user32.dll")]
    private static extern int GetSystemMetrics(int smIndex);

    private const int SRCCOPY = 0x00CC0020;
    private const int SM_CXSCREEN = 0;
    private const int SM_CYSCREEN = 1;

    public List<MonitorDetail> GetMonitors()
    {
        var width = GetSystemMetrics(SM_CXSCREEN);
        var height = GetSystemMetrics(SM_CYSCREEN);

        return new List<MonitorDetail>
        {
            new(0, "Primary Display", width > 0 ? width : 1920, height > 0 ? height : 1080, true)
        };
    }

    public byte[] CaptureSnapshot(int quality = 75)
    {
        int width = GetSystemMetrics(SM_CXSCREEN);
        int height = GetSystemMetrics(SM_CYSCREEN);

        if (width <= 0 || height <= 0)
        {
            width = 1920;
            height = 1080;
        }

        IntPtr hdcSrc = GetDC(IntPtr.Zero);
        IntPtr hdcDest = CreateCompatibleDC(hdcSrc);
        IntPtr hBitmap = CreateCompatibleBitmap(hdcSrc, width, height);
        IntPtr hOld = SelectObject(hdcDest, hBitmap);

        BitBlt(hdcDest, 0, 0, width, height, hdcSrc, 0, 0, SRCCOPY);
        SelectObject(hdcDest, hOld);

        using var bmp = Image.FromHbitmap(hBitmap);
        DeleteDC(hdcDest);
        ReleaseDC(IntPtr.Zero, hdcSrc);
        DeleteObject(hBitmap);

        using var ms = new MemoryStream();
        var encoder = GetEncoder(ImageFormat.Jpeg);
        var encoderParams = new EncoderParameters(1);
        encoderParams.Param[0] = new EncoderParameter(Encoder.Quality, (long)quality);

        if (encoder != null)
        {
            bmp.Save(ms, encoder, encoderParams);
        }
        else
        {
            bmp.Save(ms, ImageFormat.Jpeg);
        }

        return ms.ToArray();
    }

    public void StartStreaming(Func<byte[], Task> onFrameReady, int targetFps = 15, int quality = 70)
    {
        if (_isStreaming) return;
        _isStreaming = true;
        _streamingCts = new CancellationTokenSource();

        var token = _streamingCts.Token;
        int delayMs = Math.Max(33, 1000 / targetFps);

        Task.Run(async () =>
        {
            Log.Information("Started real-time screen streaming loop at {Fps} FPS, quality {Q}%", targetFps, quality);
            while (!token.IsCancellationRequested && _isStreaming)
            {
                try
                {
                    var frameBytes = CaptureSnapshot(quality);
                    if (frameBytes.Length > 0)
                    {
                        await onFrameReady(frameBytes);
                    }
                }
                catch (Exception ex)
                {
                    Log.Debug(ex, "Screen capture cycle transient error");
                }

                await Task.Delay(delayMs, token);
            }
        }, token);
    }

    public void StopStreaming()
    {
        _isStreaming = false;
        _streamingCts?.Cancel();
        _streamingCts = null;
        Log.Information("Stopped screen streaming loop");
    }

    private static ImageCodecInfo? GetEncoder(ImageFormat format)
    {
        var codecs = ImageCodecInfo.GetImageEncoders();
        foreach (var codec in codecs)
        {
            if (codec.FormatID == format.Guid) return codec;
        }
        return null;
    }
}
