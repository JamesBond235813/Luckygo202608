param(
    [string]$Src,
    [string]$Dest,
    [int]$OutW = 720,
    [int]$OutH = 400
)

Add-Type -AssemblyName System.Drawing

function Is-Background([System.Drawing.Color]$c) {
    $lum = 0.299 * $c.R + 0.587 * $c.G + 0.114 * $c.B
    if ($c.A -lt 16) { return $true }
    # near-black letterbox
    if ($lum -lt 28) { return $true }
    # light gray / white padding
    if ($lum -gt 210 -and [Math]::Abs($c.R - $c.G) -lt 18 -and [Math]::Abs($c.G - $c.B) -lt 18) { return $true }
    return $false
}

$img = [System.Drawing.Bitmap]::FromFile($Src)
$w = $img.Width
$h = $img.Height

$minX = $w; $minY = $h; $maxX = 0; $maxY = 0
for ($y = 0; $y -lt $h; $y++) {
    for ($x = 0; $x -lt $w; $x++) {
        if (-not (Is-Background $img.GetPixel($x, $y))) {
            if ($x -lt $minX) { $minX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

if ($maxX -le $minX -or $maxY -le $minY) {
    throw "No content detected in $Src"
}

$cropW = $maxX - $minX + 1
$cropH = $maxY - $minY + 1
$cropRect = New-Object System.Drawing.Rectangle $minX, $minY, $cropW, $cropH

$cropped = New-Object System.Drawing.Bitmap $cropW, $cropH
$g1 = [System.Drawing.Graphics]::FromImage($cropped)
$g1.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $cropW, $cropH), $cropRect, [System.Drawing.GraphicsUnit]::Pixel)
$g1.Dispose()
$img.Dispose()

# center-crop to 9:5 then resize
$targetRatio = 9.0 / 5.0
$ratio = $cropW / $cropH
if ($ratio -gt $targetRatio) {
    $finalW = [int][Math]::Round($cropH * $targetRatio)
    $finalH = $cropH
    $fx = [int][Math]::Round(($cropW - $finalW) / 2)
    $fy = 0
} else {
    $finalW = $cropW
    $finalH = [int][Math]::Round($cropW / $targetRatio)
    $fx = 0
    $fy = [int][Math]::Round(($cropH - $finalH) / 2)
}

$finalRect = New-Object System.Drawing.Rectangle $fx, $fy, $finalW, $finalH
$finalCrop = New-Object System.Drawing.Bitmap $finalW, $finalH
$g2 = [System.Drawing.Graphics]::FromImage($finalCrop)
$g2.DrawImage($cropped, (New-Object System.Drawing.Rectangle 0, 0, $finalW, $finalH), $finalRect, [System.Drawing.GraphicsUnit]::Pixel)
$g2.Dispose()
$cropped.Dispose()

$out = New-Object System.Drawing.Bitmap $OutW, $OutH
$g3 = [System.Drawing.Graphics]::FromImage($out)
$g3.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g3.DrawImage($finalCrop, 0, 0, $OutW, $OutH)
$g3.Dispose()
$finalCrop.Dispose()

$out.Save($Dest, [System.Drawing.Imaging.ImageFormat]::Png)
$out.Dispose()
Write-Output "trimmed $Src ($cropW x $cropH content) -> $Dest (${OutW}x${OutH})"
