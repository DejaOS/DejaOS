Add-Type -AssemblyName System.Drawing

$iconOutputDir = Join-Path $PSScriptRoot '..\app\resource\icon'
$iconOutputDir = [System.IO.Path]::GetFullPath($iconOutputDir)
$microIconOutputDir = Join-Path $PSScriptRoot '..\webapi\data\app-icons'
$microIconOutputDir = [System.IO.Path]::GetFullPath($microIconOutputDir)
New-Item -ItemType Directory -Path $iconOutputDir -Force | Out-Null
New-Item -ItemType Directory -Path $microIconOutputDir -Force | Out-Null

function New-IconCanvas {
    $bitmap = New-Object System.Drawing.Bitmap 40, 40
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $graphics.Clear([System.Drawing.Color]::Transparent)
    return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function New-WhitePen([float]$width = 3) {
    $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $width
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    return $pen
}

function Save-Icon($canvas, [string]$name, [string]$directory = $iconOutputDir) {
    $target = Join-Path $directory $name
    $canvas.Bitmap.Save($target, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Graphics.Dispose()
    $canvas.Bitmap.Dispose()
}

# Configuration gear
$canvas = New-IconCanvas
$pen = New-WhitePen 3
$canvas.Graphics.DrawEllipse($pen, 12, 12, 16, 16)
$canvas.Graphics.DrawEllipse($pen, 17, 17, 6, 6)
for ($i = 0; $i -lt 8; $i++) {
    $angle = $i * [Math]::PI / 4
    $x1 = 20 + [Math]::Cos($angle) * 11
    $y1 = 20 + [Math]::Sin($angle) * 11
    $x2 = 20 + [Math]::Cos($angle) * 16
    $y2 = 20 + [Math]::Sin($angle) * 16
    $canvas.Graphics.DrawLine($pen, [float]$x1, [float]$y1, [float]$x2, [float]$y2)
}
$pen.Dispose()
Save-Icon $canvas 'config.png'

# Application grid
$canvas = New-IconCanvas
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$canvas.Graphics.FillRectangle($brush, 6, 6, 12, 12)
$canvas.Graphics.FillRectangle($brush, 22, 6, 12, 12)
$canvas.Graphics.FillRectangle($brush, 6, 22, 12, 12)
$canvas.Graphics.FillRectangle($brush, 22, 22, 12, 12)
$brush.Dispose()
Save-Icon $canvas 'apps.png'
Copy-Item -LiteralPath (Join-Path $iconOutputDir 'apps.png') -Destination (Join-Path $microIconOutputDir 'default.png') -Force

# Weather: sun and cloud
$canvas = New-IconCanvas
$pen = New-WhitePen 2.6
$canvas.Graphics.DrawEllipse($pen, 8, 6, 12, 12)
foreach ($line in @(@(14,2,14,5), @(14,19,14,22), @(4,12,7,12), @(21,12,24,12), @(6,4,8,6), @(20,18,22,20))) {
    $canvas.Graphics.DrawLine($pen, $line[0], $line[1], $line[2], $line[3])
}
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$canvas.Graphics.FillEllipse($brush, 7, 22, 16, 12)
$canvas.Graphics.FillEllipse($brush, 15, 17, 16, 17)
$canvas.Graphics.FillEllipse($brush, 24, 23, 10, 11)
$canvas.Graphics.FillRectangle($brush, 12, 27, 20, 7)
$brush.Dispose()
$pen.Dispose()
Save-Icon $canvas 'weather.png' $microIconOutputDir

# Calendar
$canvas = New-IconCanvas
$pen = New-WhitePen 3
$canvas.Graphics.DrawRectangle($pen, 6, 8, 28, 27)
$canvas.Graphics.DrawLine($pen, 6, 15, 34, 15)
$canvas.Graphics.DrawLine($pen, 13, 5, 13, 11)
$canvas.Graphics.DrawLine($pen, 27, 5, 27, 11)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
foreach ($point in @(@(12,21), @(20,21), @(28,21), @(12,28), @(20,28), @(28,28))) {
    $canvas.Graphics.FillEllipse($brush, $point[0] - 1.5, $point[1] - 1.5, 3, 3)
}
$brush.Dispose()
$pen.Dispose()
Save-Icon $canvas 'calendar.png' $microIconOutputDir

# Notes document and pencil
$canvas = New-IconCanvas
$pen = New-WhitePen 2.7
$canvas.Graphics.DrawRectangle($pen, 7, 5, 24, 30)
$canvas.Graphics.DrawLine($pen, 12, 13, 26, 13)
$canvas.Graphics.DrawLine($pen, 12, 19, 24, 19)
$canvas.Graphics.DrawLine($pen, 12, 25, 20, 25)
$canvas.Graphics.DrawLine($pen, 22, 31, 34, 19)
$canvas.Graphics.DrawLine($pen, 25, 34, 37, 22)
$pen.Dispose()
Save-Icon $canvas 'notes.png' $microIconOutputDir

# Wi-Fi signal
$canvas = New-IconCanvas
$pen = New-WhitePen 3
$canvas.Graphics.DrawArc($pen, 4, 5, 32, 30, 215, 110)
$canvas.Graphics.DrawArc($pen, 10, 12, 20, 18, 215, 110)
$canvas.Graphics.DrawArc($pen, 16, 20, 8, 7, 215, 110)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$canvas.Graphics.FillEllipse($brush, 18, 31, 4, 4)
$brush.Dispose()
$pen.Dispose()
Save-Icon $canvas 'wifi.png'

# Host: connected device nodes
$canvas = New-IconCanvas
$pen = New-WhitePen 2.8
$canvas.Graphics.DrawEllipse($pen, 14, 14, 12, 12)
foreach ($line in @(@(20,14,20,5), @(26,20,35,20), @(20,26,20,35), @(14,20,5,20))) {
    $canvas.Graphics.DrawLine($pen, $line[0], $line[1], $line[2], $line[3])
}
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
foreach ($point in @(@(20,4), @(36,20), @(20,36), @(4,20))) {
    $canvas.Graphics.FillEllipse($brush, $point[0] - 3, $point[1] - 3, 6, 6)
}
$brush.Dispose()
$pen.Dispose()
Save-Icon $canvas 'host.png'

# Network cable / connection
$canvas = New-IconCanvas
$pen = New-WhitePen 3
$canvas.Graphics.DrawRectangle($pen, 5, 11, 12, 18)
$canvas.Graphics.DrawRectangle($pen, 23, 11, 12, 18)
$canvas.Graphics.DrawLine($pen, 17, 20, 23, 20)
$canvas.Graphics.DrawLine($pen, 9, 8, 9, 13)
$canvas.Graphics.DrawLine($pen, 13, 8, 13, 13)
$canvas.Graphics.DrawLine($pen, 27, 27, 27, 32)
$canvas.Graphics.DrawLine($pen, 31, 27, 31, 32)
$pen.Dispose()
Save-Icon $canvas 'network.png'

# Application service: server with connection indicator
$canvas = New-IconCanvas
$pen = New-WhitePen 2.7
$canvas.Graphics.DrawRectangle($pen, 6, 7, 28, 11)
$canvas.Graphics.DrawRectangle($pen, 6, 22, 28, 11)
$canvas.Graphics.DrawLine($pen, 11, 13, 14, 13)
$canvas.Graphics.DrawLine($pen, 11, 28, 14, 28)
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$canvas.Graphics.FillEllipse($brush, 27, 11, 4, 4)
$canvas.Graphics.FillEllipse($brush, 27, 26, 4, 4)
$brush.Dispose()
$pen.Dispose()
Save-Icon $canvas 'service.png'

Get-ChildItem -LiteralPath $iconOutputDir -Filter '*.png' | Select-Object Name, Length
Get-ChildItem -LiteralPath $microIconOutputDir -Filter '*.png' | Select-Object Name, Length
