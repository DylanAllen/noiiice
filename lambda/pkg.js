const fs = require('fs')
const archiver = require('archiver');
const execSync = require('child_process').execSync;

const functions = serverless.service.functions;
const service = serverless.service.service;
const stage = serverless.service.provider.stage;
const prefix = `${service}-${stage}-`;

Object.keys(functions).forEach(func => {
  let [,name] = functions[func].name.split(prefix);
  console.log(name);
  if (name !== 'nuxt') {
    let output = fs.createWriteStream(`lambda/${name}/${name}.zip`);
    let archive = archiver('zip', { zlib: { level: 9 }});
    output.on('close', () => console.log(`${name} has been closed`));
    archive.on('error', (err) => console.log(err));
    let files = fs.readdirSync(`lambda/${name}`)
    files.forEach(file => {
      if (file.endsWith('.js')) {
        let filePath = `lambda/${name}/${file}`;
        archive.append(fs.createReadStream(filePath), {name: file});
      }
    })
    archive.pipe(output);
    archive.finalize();
  }
})

// console.log('Creating lambda layer');
// let output = fs.createWriteStream(`layers/nodejs.zip`);
// let archive = archiver('zip', { zlib: { level: 9 }});
// output.on('close', () => console.log(`Lambda layer has been closed`));
// archive.on('error', (err) => console.log(err));
// archive.pipe(output);
// archive.directory('layers/nodejs/node_modules', 'nodejs/node_modules');
// archive.finalize();
