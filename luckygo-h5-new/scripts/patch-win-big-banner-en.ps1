param(
    [string]$Src = (Join-Path $PSScriptRoot '..\public\banners\win-big-banner-en.png'),
    [string]$Dest = (Join-Path $PSScriptRoot '..\public\banners\win-big-banner-en.png')
)

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Common -ErrorAction SilentlyContinue

$srcPath = [System.IO.Path]::GetFullPath($Src)
$destPath = [System.IO.Path]::GetFullPath($Dest)

$bitmap = [System.Drawing.Bitmap]::FromFile($srcPath)
$g = [System.Drawing.Graphics]::FromImage($bitmap)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

$w = $bitmap.Width
$h = $bitmap.Height

function New-Font($family, $size, $style) {
    return New-Object System.Drawing.Font $family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel
}

$greenDark = [System.Drawing.Color]::FromArgb(255, 0, 60, 45)
$greenMid = [System.Drawing.Color]::FromArgb(255, 0, 90, 65)
$gold = [System.Drawing.Color]::FromArgb(255, 252, 211, 77)
$goldDeep = [System.Drawing.Color]::FromArgb(255, 201, 162, 39)
$white = [System.Drawing.Color]::White

# --- Cover old subtitle band (approx. for 720x400 banner) ---
$subLeft = [int]($w * 0.04)
$subTop = [int]($h * 0.40)
$subW = [int]($w * 0.58)
$subH = [int]($h * 0.14)
$subRect = New-Object System.Drawing.Rectangle $subLeft, $subTop, $subW, $subH
$subBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $subRect,
    [System.Drawing.Color]::FromArgb(210, 0, 70, 52),
    [System.Drawing.Color]::FromArgb(0, 0, 70, 52),
    0.0
)
$g.FillRectangle($subBrush, $subRect)
$subBrush.Dispose()

$fontSubGold = New-Font 'Segoe UI' ([int]($h * 0.052)) ([System.Drawing.FontStyle]::Bold)
$fontSubWhite = New-Font 'Segoe UI' ([int]($h * 0.042)) ([System.Drawing.FontStyle]::Regular)
$subY = $subTop + [int]($h * 0.018)
$g.DrawString('5 GHS =' , $fontSubGold, (New-Object System.Drawing.SolidBrush $gold), $subLeft, $subY)
$goldSize = $g.MeasureString('5 GHS = ', $fontSubGold)
$line1 = 'stand a chance to win any phone you stake'
$g.DrawString($line1, $fontSubWhite, (New-Object System.Drawing.SolidBrush $white), ($subLeft + $goldSize.Width), $subY)

# --- Redraw top-right price badge ---
$badgeSize = [int]([Math]::Min($w, $h) * 0.19)
$badgeX = $w - $badgeSize - [int]($w * 0.04)
$badgeY = [int]($h * 0.05)
$badgeRect = New-Object System.Drawing.Rectangle $badgeX, $badgeY, $badgeSize, $badgeSize

# Soft green halo to erase old badge edge
$halo = [int]($badgeSize * 0.12)
$haloRect = New-Object System.Drawing.Rectangle ($badgeX - $halo), ($badgeY - $halo), ($badgeSize + 2 * $halo), ($badgeSize + 2 * $halo)
$haloBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 0, 75, 55))
$g.FillEllipse($haloBrush, $haloRect)
$haloBrush.Dispose()

$badgeBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    $badgeRect,
    $gold,
    $goldDeep,
    135.0
)
$g.FillEllipse($badgeBrush, $badgeRect)
$badgeBrush.Dispose()

$badgeBorder = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 235, 140)), 3
$g.DrawEllipse($badgeBorder, $badgeRect)
$badgeBorder.Dispose()

$fontBadgeNum = New-Font 'Segoe UI' ([int]($badgeSize * 0.42)) ([System.Drawing.FontStyle]::Bold)
$fontBadgeUnit = New-Font 'Segoe UI' ([int]($badgeSize * 0.18)) ([System.Drawing.FontStyle]::Bold)
$num = '5'
$unit = 'GHS'
$numSize = $g.MeasureString($num, $fontBadgeNum)
$unitSize = $g.MeasureString($unit, $fontBadgeUnit)
$textBlockH = $numSize.Height + $unitSize.Height - 6
$numX = $badgeX + ($badgeSize - $numSize.Width) / 2
$numY = $badgeY + ($badgeSize - $textBlockH) / 2
$unitX = $badgeX + ($badgeSize - $unitSize.Width) / 2
$unitY = $numY + $numSize.Height - 8
$textBrush = New-Object System.Drawing.SolidBrush $greenDark
$g.DrawString($num, $fontBadgeNum, $textBrush, $numX, $numY)
$g.DrawString($unit, $fontBadgeUnit, $textBrush, $unitX, $unitY)
$textBrush.Dispose()

$fontSubGold.Dispose()
$fontSubWhite.Dispose()
$fontBadgeNum.Dispose()
$fontBadgeUnit.Dispose()

$g.Dispose()
$bitmap.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
$bitmap.Dispose()

Write-Output "Patched banner saved to: $destPath"
