const fs = require('fs')
const archiver = require('archiver');
const execSync = require('child_process').execSync;

module.exports = (sls) => {

  sls.cli.log('Packaging lambda functions');
  const functions = sls.service.functions;
  const service = sls.service.service;
  const stage = sls.service.provider.stage;
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
}
