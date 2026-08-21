param(
    [string]$Src,
    [string]$Dest,
    [int]$OutW = 720,
    [int]$OutH = 400
)

Add-Type -AssemblyName System.Drawing

$img = [System.Drawing.Image]::FromFile($Src)
$srcW = $img.Width
$srcH = $img.Height
$targetRatio = 9.0 / 5.0

# 9:5 center crop — keep full width, trim top/bottom equally (no stretch)
$cropW = $srcW
$cropH = [int][Math]::Round($srcW / $targetRatio)
if ($cropH -gt $srcH) {
    $cropH = $srcH
    $cropW = [int][Math]::Round($srcH * $targetRatio)
}

$cropX = [int][Math]::Round(($srcW - $cropW) / 2)
$cropY = [int][Math]::Round(($srcH - $cropH) / 2)

$cropRect = New-Object System.Drawing.Rectangle $cropX, $cropY, $cropW, $cropH
$cropped = New-Object System.Drawing.Bitmap $cropW, $cropH
$g1 = [System.Drawing.Graphics]::FromImage($cropped)
$g1.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g1.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$g1.Dispose()
$img.Dispose()

$out = New-Object System.Drawing.Bitmap $OutW, $OutH
$g2 = [System.Drawing.Graphics]::FromImage($out)
$g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g2.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$g2.DrawImage($cropped, 0, 0, $OutW, $OutH)
$g2.Dispose()
$cropped.Dispose()

$out.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
Write-Output "center-crop ${cropW}x${cropH} (uniform) -> ${OutW}x${OutH}: $Dest"
