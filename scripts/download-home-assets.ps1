param([int]$MaximumMegabytes = 312, [switch]$MudroomOnly)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$root = Split-Path $PSScriptRoot -Parent
$destination = Join-Path $root 'assets\models'
$headers = @{ 'User-Agent' = 'CustomHome-AssetLibrary/1.0' }
$records = [Collections.Generic.List[object]]::new()
$skipped = [Collections.Generic.List[object]]::new()
$archives = [Collections.Generic.List[string]]::new()
$script:bytes = 0

function Save-AssetFile($url, $path, $md5 = '') {
    New-Item -ItemType Directory -Force (Split-Path $path -Parent) | Out-Null
    $verifiedExisting = $md5 -and (Test-Path -LiteralPath $path) -and (Get-FileHash $path -Algorithm MD5).Hash.ToLowerInvariant() -eq $md5
    if (!$verifiedExisting) { Invoke-WebRequest $url -Headers $headers -OutFile $path }
    if ($md5 -and (Get-FileHash $path -Algorithm MD5).Hash.ToLowerInvariant() -ne $md5) {
        Write-Warning "Checksum mismatch; retrying without the stale CDN response: $url"
        Invoke-WebRequest ($url + '?checksum=' + $md5) -Headers $headers -OutFile $path
    }
    $length = (Get-Item $path).Length
    if (!$length -or $length -gt 50MB) { throw "Empty or oversized asset: $path ($length bytes)" }
    if ($md5 -and (Get-FileHash $path -Algorithm MD5).Hash.ToLowerInvariant() -ne $md5) { throw "Download checksum mismatch: $url" }
    $script:bytes += $length
    if ($script:bytes -gt $MaximumMegabytes * 1MB) { throw "Asset library exceeds $MaximumMegabytes MiB; review downloaded files before continuing." }
    return [ordered]@{
        path = [IO.Path]::GetRelativePath($destination, $path).Replace('\', '/')
        bytes = $length
        sha256 = (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant()
        download = $url
    }
}

$packs = @(
    @{ id = 'furniture-kit'; url = 'https://kenney.nl/media/pages/assets/furniture-kit/440e0608a4-1677580847/kenney_furniture-kit.zip' },
    @{ id = 'nature-kit'; url = 'https://kenney.nl/media/pages/assets/nature-kit/37ac38a37b-1677698939/kenney_nature-kit.zip' },
    @{ id = 'city-kit-suburban'; url = 'https://kenney.nl/media/pages/assets/city-kit-suburban/2c871b7af2-1745479373/kenney_city-kit-suburban_20.zip' },
    @{ id = 'food-kit'; url = 'https://kenney.nl/media/pages/assets/food-kit/83086fa91c-1719418518/kenney_food-kit.zip' },
    @{ id = 'car-kit'; url = 'https://kenney.nl/media/pages/assets/car-kit/1a312ec241-1775131960/kenney_car-kit.zip' },
    @{ id = 'survival-kit'; url = 'https://kenney.nl/media/pages/assets/survival-kit/4065a8185b-1712149243/kenney_survival-kit.zip' },
    @{ id = 'holiday-kit'; url = 'https://kenney.nl/media/pages/assets/holiday-kit/3976a6496a-1733923970/kenney_holiday-kit.zip' },
    @{ id = 'building-kit'; url = 'https://kenney.nl/media/pages/assets/building-kit/0de7aaa492-1743244741/kenney_building-kit.zip' },
    @{ id = 'mini-market'; url = 'https://kenney.nl/media/pages/assets/mini-market/463f38da51-1729865423/kenney_mini-market.zip' }
)

try {
    foreach ($pack in $packs | Where-Object { !$MudroomOnly }) {
        Write-Host "Downloading Kenney $($pack.id)"
        $archive = Join-Path ([IO.Path]::GetTempPath()) ("customhome-assets-" + [Guid]::NewGuid() + '.zip')
        $archives.Add($archive)
        Invoke-WebRequest $pack.url -Headers $headers -OutFile $archive
        $zip = [IO.Compression.ZipFile]::OpenRead($archive)
        try {
            $folder = Join-Path $destination ('kenney\' + $pack.id)
            New-Item -ItemType Directory -Force $folder | Out-Null
            $license = @($zip.Entries | Where-Object { $_.Name -ieq 'license.txt' })
            if ($license.Count -ne 1) { throw "Missing or ambiguous license in $($pack.id)" }
            $reader = [IO.StreamReader]::new($license[0].Open())
            try { $licenseText = $reader.ReadToEnd() } finally { $reader.Dispose() }
            if ($licenseText -notmatch 'CC0|Creative Commons Zero') { throw "Unverified CC0 license in $($pack.id)" }
            [IO.Compression.ZipFileExtensions]::ExtractToFile($license[0], (Join-Path $folder 'LICENSE.txt'), $true)
            $models = @($zip.Entries | Where-Object { $_.Name -match '\.glb$' })
            if (!$models.Count) { throw "No GLB models in $($pack.id)" }
            $names = [Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
            $shared = @{}
            foreach ($entry in $models) {
                if (!$names.Add($entry.Name)) { throw "Duplicate model filename: $($entry.Name)" }
                $path = Join-Path $folder $entry.Name
                [IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $path, $true)
                $length = (Get-Item $path).Length
                $script:bytes += $length
                if ($script:bytes -gt $MaximumMegabytes * 1MB -or $length -gt 50MB) { throw 'Asset size budget exceeded.' }
                $files = [Collections.Generic.List[object]]::new()
                $files.Add([ordered]@{ path = 'kenney/' + $pack.id + '/' + $entry.Name; bytes = $length; sha256 = (Get-FileHash $path -Algorithm SHA256).Hash.ToLowerInvariant(); download = $pack.url })
                $binary = [IO.File]::ReadAllBytes($path)
                $jsonLength = [BitConverter]::ToUInt32($binary, 12)
                $document = [Text.Encoding]::UTF8.GetString($binary, 20, $jsonLength) | ConvertFrom-Json
                foreach ($resource in @($document.images) + @($document.buffers)) {
                    $uri = $resource.uri
                    if (!$uri -or $uri.StartsWith('data:')) { continue }
                    if ($uri -match '(^|[/\\])\.\.([/\\]|$)|^[a-z]+:' -or [IO.Path]::IsPathRooted($uri)) { throw "Unsafe resource URI: $uri" }
                    if (!$shared.ContainsKey($uri)) {
                        $archivePath = $entry.FullName.Substring(0, $entry.FullName.LastIndexOf('/') + 1) + $uri
                        $resourceEntry = $zip.GetEntry($archivePath)
                        if (!$resourceEntry) { throw "Missing archive resource: $archivePath" }
                        $resourcePath = Join-Path $folder $uri.Replace('/', '\')
                        New-Item -ItemType Directory -Force (Split-Path $resourcePath -Parent) | Out-Null
                        [IO.Compression.ZipFileExtensions]::ExtractToFile($resourceEntry, $resourcePath, $true)
                        $resourceLength = (Get-Item $resourcePath).Length
                        $script:bytes += $resourceLength
                        if ($script:bytes -gt $MaximumMegabytes * 1MB -or $resourceLength -gt 50MB) { throw 'Asset size budget exceeded.' }
                        $shared[$uri] = [ordered]@{ path = 'kenney/' + $pack.id + '/' + $uri; bytes = $resourceLength; sha256 = (Get-FileHash $resourcePath -Algorithm SHA256).Hash.ToLowerInvariant(); download = $pack.url }
                    }
                    $files.Add($shared[$uri])
                }
                $records.Add([ordered]@{
                    id = 'kenney/' + $pack.id + '/' + [IO.Path]::GetFileNameWithoutExtension($entry.Name)
                    provider = 'Kenney'; title = [IO.Path]::GetFileNameWithoutExtension($entry.Name)
                    style = 'stylized'; source = 'https://kenney.nl/assets/' + $pack.id
                    license = 'CC0-1.0'; licenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/'
                    licenseFile = 'kenney/' + $pack.id + '/LICENSE.txt'
                    entry = 'kenney/' + $pack.id + '/' + $entry.Name
                    files = @($files.ToArray())
                })
            }
            Write-Host "  $($models.Count) GLB models"
        } finally { $zip.Dispose() }
    }

    $grabModels = @(
        'tools/car-jack', 'tools/engine-hoist', 'tools/mechanic-creeper',
        'tools/snow-shovel', 'tools/oil-can', 'tools/flashlight',
        'electronics/washing-machine', 'electronics/industrial-fan', 'electronics/fuse-box',
        'props/cooler-box', 'props/camping-lantern', 'city/bike-rack'
    )
    foreach ($modelPath in $grabModels | Where-Object { !$MudroomOnly }) {
        $id = $modelPath.Split('/')[-1]
        $source = 'https://grab3d.com/models/' + $modelPath + '/'
        Write-Host "Downloading Grab3D $id"
        $html = (Invoke-WebRequest $source -Headers $headers).Content
        if ($html -notmatch 'CC0' -or $html -notmatch '/license/') { throw "Unverified license: $source" }
        $download = [regex]::Match($html, 'href="(/dl/[^"]+\.glb)"').Groups[1].Value
        if (!$download) { throw "No GLB download on $source" }
        $file = Save-AssetFile ('https://grab3d.com' + $download) (Join-Path $destination ('grab3d\' + $id + '.glb'))
        $records.Add([ordered]@{
            id = 'grab3d/' + $id; provider = 'Grab3D'; title = $id.Replace('-', ' ')
            source = $source; style = 'stylized'; license = 'CC0-1.0'; licenseUrl = 'https://grab3d.com/license/'
            entry = $file.path; files = @($file)
        })
    }

    $realistic = @(
        'modern_arm_chair_01', 'modern_coffee_table_01', 'modern_coffee_table_02',
        'modern_wooden_cabinet', 'drawer_cabinet', 'sofa_02', 'sofa_03',
        'dining_chair_02', 'dining_table', 'side_table_01', 'side_table_tall_01',
        'potted_plant_01', 'potted_plant_02', 'potted_plant_04',
        'desk_lamp_arm_01', 'modern_ceiling_lamp_01', 'hanging_industrial_lamp',
        'steel_frame_shelves_01', 'steel_frame_shelves_02', 'wooden_bookshelf_worn',
        'adjustable_wrench', 'combination_wrench', 'cross_pein_hammer',
        'handsaw_wood', 'Drill_01', 'metal_toolbox', 'plastic_crate_01'
    )
    $catalogue = Invoke-RestMethod 'https://api.polyhaven.com/assets?t=models' -Headers $headers
    $additional = $catalogue.PSObject.Properties | Where-Object {
        ($_.Value.categories -join ',') -match 'furniture|appliances|lighting|dishes|tools|books' -and
        $_.Name -notmatch 'ammo|war_|military|barber|school|gothic|cashregister|megaphone|searchlight|welding|old_drill|statue|chemistry|bunsen|microscope|medical'
    } | ForEach-Object { $_.Name }
    $realistic = @($realistic + $additional | Select-Object -Unique)
    $realistic = if ($MudroomOnly) { @('rubber_boots') } else { @('rubber_boots') + $realistic }
    $reservedBytes = 0
    $currentManifest = Join-Path $destination 'manifest.json'
    if (Test-Path -LiteralPath $currentManifest) {
        $current = Get-Content $currentManifest -Raw | ConvertFrom-Json
        $reservedFiles = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach ($asset in $current.assets | Where-Object { $_.provider -notin @('Kenney', 'Poly Haven', 'Grab3D') }) {
            foreach ($file in $asset.files) {
                if ($reservedFiles.Add($file.path)) { $reservedBytes += $file.bytes }
            }
        }
    }
    foreach ($id in $realistic) {
        Write-Host "Downloading Poly Haven $id (1K textures)"
        $metadata = $catalogue.$id
        if (!$metadata) { throw "Unknown Poly Haven asset: $id" }
        $formats = Invoke-RestMethod ("https://api.polyhaven.com/files/$id") -Headers $headers
        $model = $formats.gltf.'1k'.gltf
        if (!$model.url) {
            Write-Warning "No 1K glTF download for $id; recorded in download report."
            $skipped.Add([ordered]@{ id = 'poly-haven/' + $id; source = 'https://polyhaven.com/a/' + $id; reason = 'No browser-ready 1K glTF variant' })
            continue
        }
        $resources = @($model) + @($model.include.PSObject.Properties | ForEach-Object { $_.Value })
        $estimate = ($resources | Measure-Object -Property size -Sum).Sum
        if (@($resources | Where-Object { $_.size -gt 50MB }).Count -or $script:bytes + $reservedBytes + $estimate -gt $MaximumMegabytes * 1MB) {
            Write-Warning "Size budget excludes $id ($estimate bytes); recorded in download report."
            $skipped.Add([ordered]@{ id = 'poly-haven/' + $id; source = 'https://polyhaven.com/a/' + $id; reason = 'Repository size budget or 50 MiB individual-file limit'; estimatedBytes = $estimate })
            continue
        }
        $folder = Join-Path $destination ('poly-haven\' + $id)
        $entryName = $id + '_1k.gltf'
        $files = [Collections.Generic.List[object]]::new()
        $files.Add((Save-AssetFile $model.url (Join-Path $folder $entryName) $model.md5))
        foreach ($dependency in $model.include.PSObject.Properties) {
            if ([IO.Path]::IsPathRooted($dependency.Name) -or $dependency.Name -match '(^|[/\\])\.\.([/\\]|$)') { throw "Unsafe dependency path: $($dependency.Name)" }
            $files.Add((Save-AssetFile $dependency.Value.url (Join-Path $folder $dependency.Name.Replace('/', '\')) $dependency.Value.md5))
        }
        $records.Add([ordered]@{
            id = 'poly-haven/' + $id; provider = 'Poly Haven'; title = $metadata.name
            authors = $metadata.authors; categories = $metadata.categories; style = 'realistic'
            source = 'https://polyhaven.com/a/' + $id
            license = 'CC0-1.0'; licenseUrl = 'https://creativecommons.org/publicdomain/zero/1.0/'
            entry = 'poly-haven/' + $id + '/' + $entryName; files = @($files.ToArray())
        })
    }

    if (!$MudroomOnly) {
    Write-Host 'Downloading attributed bicycle from Poly Pizza'
    $bike = Save-AssetFile 'https://static.poly.pizza/6048701b-fa87-426b-9242-c786ca25fa3a.glb' (Join-Path $destination 'poly-pizza\bicycle-google.glb')
    $records.Add([ordered]@{
        id = 'poly-pizza/bicycle-google'; provider = 'Poly Pizza'; title = 'Bicycle'
        authors = @('Poly by Google'); style = 'stylized'
        source = 'https://poly.pizza/m/19VoUuA2pcN'
        license = 'CC-BY-3.0'; licenseUrl = 'https://creativecommons.org/licenses/by/3.0/'
        attribution = '"Bicycle" by Poly by Google, via Poly Pizza, licensed CC BY 3.0. Model redistributed unmodified.'
        entry = $bike.path; files = @($bike)
    })
    Write-Host 'Downloading attributed Wayfair Glam velvet sofa from Khronos'
    $sofa = Save-AssetFile 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/GlamVelvetSofa/glTF-Binary/GlamVelvetSofa.glb' (Join-Path $destination 'khronos\GlamVelvetSofa.glb')
    if ($sofa.sha256 -ne '67202c74a1a33377771f162dc7fad612a6c9bd51ee15124c488e9851d9ac5266') { throw 'The pinned sofa asset changed; verify its provenance and license before updating.' }
    $records.Add([ordered]@{
        id = 'khronos/glam-velvet-sofa'; provider = 'Khronos glTF Sample Assets'; title = 'Glam Velvet Sofa'
        style = 'realistic product visualization'
        source = 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/GlamVelvetSofa'
        license = 'CC-BY-4.0'; licenseUrl = 'https://creativecommons.org/licenses/by/4.0/'
        attribution = 'GlamVelvetSofa, copyright 2021 Wayfair, LLC. Eric Chadwick for everything. CC BY 4.0. Original GLB retained unmodified; viewer uniformly scales and positions the asset, selects its authored Champagne fabric, and disables its embedded light.'
        entry = $sofa.path; files = @($sofa)
    })
    }
    Write-Host 'Downloading attributed Shopify shoe from Khronos'
    $shoe = Save-AssetFile 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Assets/main/Models/MaterialsVariantsShoe/glTF-Binary/MaterialsVariantsShoe.glb' (Join-Path $destination 'khronos\MaterialsVariantsShoe.glb')
    if ($shoe.sha256 -ne 'e1d7cb190382111e5a5b37b51e9a7f007f7eb2ab1b6185e0188e8d0a0d1265a7') { throw 'The pinned shoe asset changed; verify its provenance and license before updating.' }
    $records.Add([ordered]@{
        id = 'khronos/materials-variants-shoe'; provider = 'Khronos glTF Sample Assets'; title = 'Materials Variants Shoe'
        style = 'realistic'; authors = @('Shopify')
        source = 'https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/MaterialsVariantsShoe'
        license = 'CC-BY-4.0'; licenseUrl = 'https://creativecommons.org/licenses/by/4.0/'
        attribution = 'Materials Variants Shoe, copyright 2021 Shopify, CC BY 4.0. Original GLB retained unmodified; viewer uniformly scales, rotates and clones it for conceptual mudroom footwear.'
        entry = $shoe.path; files = @($shoe)
    })
    $manifestPath = Join-Path $destination 'manifest.json'
    if (Test-Path -LiteralPath $manifestPath) {
        $previous = Get-Content $manifestPath -Raw | ConvertFrom-Json
        $importedIds = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
        foreach ($record in $records) { $importedIds.Add($record.id) | Out-Null }
        foreach ($record in $previous.assets) {
            if ($importedIds.Add($record.id)) {
                Write-Host "Preserving separately imported asset: $($record.id)"
                $records.Add($record)
            }
        }
    }
    $uniqueFiles = [Collections.Generic.HashSet[string]]::new([StringComparer]::Ordinal)
    $script:bytes = 0
    foreach ($record in $records) {
        foreach ($file in $record.files) {
            if ($uniqueFiles.Add($file.path)) { $script:bytes += $file.bytes }
        }
    }
    if ($script:bytes -gt $MaximumMegabytes * 1MB) { throw 'Preserved and downloaded assets exceed the repository size budget; manifest has not been overwritten.' }
    $reportPath = Join-Path $destination 'download-report.json'
    if ($MudroomOnly -and (Test-Path -LiteralPath $reportPath)) {
        foreach ($record in (Get-Content $reportPath -Raw | ConvertFrom-Json).skipped) { $skipped.Add($record) }
    }
    $report = [ordered]@{ retrievedOn = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd'); maximumMegabytes = $MaximumMegabytes; skipped = @($skipped.ToArray()) }
    $report | ConvertTo-Json -Depth 10 | Set-Content (Join-Path $destination 'download-report.json') -Encoding utf8
    $manifest = [ordered]@{
        schemaVersion = 1; retrievedOn = (Get-Date).ToUniversalTime().ToString('yyyy-MM-dd')
        purpose = 'Reusable local asset library; not automatically placed in the home model. Dimensions and suitability are unverified.'
        assetCount = $records.Count; totalBytes = $script:bytes
        assets = @($records.ToArray() | Sort-Object { $_.id })
    }
    $manifest | ConvertTo-Json -Depth 20 | Set-Content $manifestPath -Encoding utf8
    Write-Host ("Saved {0} assets, {1:N1} MiB" -f $records.Count, ($script:bytes / 1MB))
} finally {
    foreach ($archive in $archives) { if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive } }
}
