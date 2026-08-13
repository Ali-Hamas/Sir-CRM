const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let content = fs.readFileSync(schemaPath, 'utf8');

// 1. Ensure provider is mongodb
content = content.replace(/provider\s*=\s*"sqlite"/g, 'provider = "mongodb"');

// 2. Add @map("_id") to any @id field that lacks @map("_id")
// Matches: id   String   @id @default(...) [but NOT already having @map("_id")]
content = content.replace(
  /(\s+id\s+String\s+@id[^\n]*?)(\s*\n)/g,
  (match, fieldPart, lineEnd) => {
    if (fieldPart.includes('@map("_id")')) {
      return match; // already has it
    }
    return fieldPart + ' @map("_id")' + lineEnd;
  }
);

// 3. Strip ALL existing onDelete and onUpdate from @relation(...)
// We do this iteratively to be safe
content = content.replace(/,\s*onDelete:\s*\w+/g, '');
content = content.replace(/,\s*onUpdate:\s*\w+/g, '');

// 4. Add onDelete: NoAction, onUpdate: NoAction to all @relation(...) that have fields: [...]
// This regex matches the entire @relation(...) content and appends before the closing )
content = content.replace(
  /(@relation\([^)]*fields:\s*\[[^\]]+\][^)]*)\)/g,
  '$1, onDelete: NoAction, onUpdate: NoAction)'
);

// 5. Fix RAGEmbedding model:
//    - chunkId has @unique already - remove redundant @@index([chunkId])
content = content.replace(
  /(model RAGEmbedding\s*\{[\s\S]*?)(@@index\(\[chunkId\]\))([\s\S]*?\})/g,
  (match, before, indexLine, after) => before + after
);

// 6. Fix RAGSearchResult model:
//    - chunkId should NOT be @unique (it maps to many results)
//    - Remove @@unique and @@index on chunkId
content = content.replace(
  /model RAGSearchResult\s*\{([\s\S]*?)\}/g,
  (match, inner) => {
    let cleaned = inner
      .replace(/chunkId\s+String\s+@unique/g, 'chunkId            String')
      .replace(/\s*@@unique\(\[chunkId\]\)/g, '')
      .replace(/\s*@@index\(\[chunkId\]\)/g, '');
    return `model RAGSearchResult {${cleaned}}`;
  }
);

// 7. Fix RAGEmbedding chunkId @unique + @@unique conflict:
//    Remove @@unique([chunkId]) from RAGEmbedding if chunkId already has @unique inline
content = content.replace(
  /model RAGEmbedding\s*\{([\s\S]*?)\}/g,
  (match, inner) => {
    let cleaned = inner.replace(/\s*@@unique\(\[chunkId\]\)/g, '');
    return `model RAGEmbedding {${cleaned}}`;
  }
);

// 8. Fix AITool key @unique + @@unique / @@index conflict
content = content.replace(
  /model AITool\s*\{([\s\S]*?)\}/g,
  (match, inner) => {
    let cleaned = inner
      .replace(/\s*@@unique\(\[key\]\)/g, '')
      .replace(/\s*@@index\(\[key\]\)/g, '');
    return `model AITool {${cleaned}}`;
  }
);

// 9. Fix Project projectCode @unique + @@index conflict
content = content.replace(
  /model Project\s*\{([\s\S]*?)\}/g,
  (match, inner) => {
    let cleaned = inner.replace(/\s*@@index\(\[projectCode\]\)/g, '');
    return `model Project {${cleaned}}`;
  }
);

fs.writeFileSync(schemaPath, content, 'utf8');
console.log('Fixed schema.prisma for MongoDB!');
