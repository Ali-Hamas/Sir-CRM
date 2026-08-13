const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// Ensure provider is mongodb
content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "mongodb"');

// Ensure every @id line has @map("_id") for MongoDB
const lines = content.split('\n');
const updatedLines = lines.map(line => {
  if (line.includes('@id') && !line.includes('@map("_id")')) {
    return line.replace('@id', '@id @map("_id")');
  }
  return line;
});

fs.writeFileSync(schemaPath, updatedLines.join('\n'), 'utf8');
console.log('Successfully updated schema.prisma for MongoDB!');
