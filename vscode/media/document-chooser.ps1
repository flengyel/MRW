$ErrorActionPreference='Stop'
[Console]::InputEncoding=[Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false)
$r=[Console]::In.ReadToEnd()|ConvertFrom-Json
$root=[IO.DirectoryInfo]::new($r.root)
$entries=[Collections.Generic.List[object]]::new();$errors=[Collections.Generic.List[string]]::new();$headers=@{};$complete=$true;$count=0;$total=0
$excluded=@('.obsidian','.trash','.git','.lake','node_modules','.venv','__pycache__')
if($r.mode -eq 'titles'){
 foreach($relative in $r.files){
  if($total -ge $r.maxTitleBytes){$complete=$false;break}
  $stream=$null
  try{
   $file=[IO.FileInfo]::new([IO.Path]::Combine($root.FullName,$relative))
   if($file.Extension -notin @('.md','.markdown')){continue}
   if(($file.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){$complete=$false;continue}
   $ancestor=$file.Directory;$redirected=$false
   while($ancestor -and $ancestor.FullName.Length -ge $root.FullName.Length){
    if(($ancestor.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){$redirected=$true;break};$ancestor=$ancestor.Parent
   }
   if($redirected){$complete=$false;continue}
   $stream=[IO.File]::Open($file.FullName,[IO.FileMode]::Open,[IO.FileAccess]::Read,([IO.FileShare]::ReadWrite -bor [IO.FileShare]::Delete))
   $buffer=[byte[]]::new([Math]::Min($r.headerBytes,$r.maxTitleBytes-$total));$read=$stream.Read($buffer,0,$buffer.Length);$total+=$read
   $headers[$relative]=[Convert]::ToBase64String($buffer,0,$read)
  }catch{$complete=$false}finally{if($stream){$stream.Dispose()}}
 }
}else{
 $pending=[Collections.Generic.Stack[object]]::new();$pending.Push(@($root,0))
 while($pending.Count -gt 0){
  $item=$pending.Pop()
  try{foreach($entry in $item[0].EnumerateFileSystemInfos()){
   if($entry.Name -in $excluded -or ($entry.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0){continue}
   $count++;if($count -gt $r.maxEntries -or $entries.Count -ge $r.maxItems){$complete=$false;$pending.Clear();break}
   $directory=($entry.Attributes -band [IO.FileAttributes]::Directory) -ne 0
   $relative=$entry.FullName.Substring($root.FullName.TrimEnd('\').Length+1).Replace('\','/')
   if($directory -and $r.mode -eq 'search'){
    if($item[1] -lt $r.maxDepth){$pending.Push(@($entry,($item[1]+1)))}else{$complete=$false}
   }else{$entries.Add(@{path=$relative;type=$(if($directory){'folder'}else{'file'})})}
  }}catch{$errors.Add($_.Exception.Message);$complete=$false}
 }
}
@{entries=@($entries);headers=$headers;complete=$complete;errors=@($errors)}|ConvertTo-Json -Depth 5 -Compress
