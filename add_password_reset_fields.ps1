# PowerShell script to add password reset fields to the database
# Run this script from the Train-At-Trails directory

Write-Host "🔧 Adding password reset fields to users table..." -ForegroundColor Yellow

# Check if sqlite3 is available
$sqliteCommand = Get-Command sqlite3 -ErrorAction SilentlyContinue
if (-not $sqliteCommand) {
    Write-Host "❌ sqlite3 command not found. Trying alternative method..." -ForegroundColor Red
    
    # Try using Node.js script instead
    if (Test-Path "add_password_reset_fields.js") {
        Write-Host "🔄 Running Node.js script..." -ForegroundColor Cyan
        node add_password_reset_fields.js
        exit
    } else {
        Write-Host "❌ Please install SQLite3 or use the Node.js script method" -ForegroundColor Red
        Write-Host "💡 Alternative: Install SQLite3 from https://sqlite.org/download.html" -ForegroundColor Yellow
        exit 1
    }
}

# SQLite database path
$dbPath = "backend\prisma\dev.db"

if (-not (Test-Path $dbPath)) {
    Write-Host "❌ Database file not found at: $dbPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database found at: $dbPath" -ForegroundColor Green

# SQL commands to add the fields
$sqlCommands = @(
    "ALTER TABLE users ADD COLUMN resetToken TEXT;",
    "ALTER TABLE users ADD COLUMN resetTokenExpiry DATETIME;",
    "CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(resetToken);"
)

# Execute each SQL command
foreach ($sql in $sqlCommands) {
    Write-Host "🔧 Executing: $sql" -ForegroundColor Cyan
    $result = & sqlite3 $dbPath $sql
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Success!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Command may have failed (possibly already exists)" -ForegroundColor Yellow
    }
}

# Check the updated schema
Write-Host "`n📋 Current users table schema:" -ForegroundColor Cyan
& sqlite3 $dbPath ".schema users"

Write-Host "`n✨ Password reset fields setup complete!" -ForegroundColor Green
Write-Host "🚀 Restart your development server and try the forgot password feature." -ForegroundColor Yellow
