const {postHandler} = require('./_lib');
module.exports = postHandler({cek: 'klaim-cek', verifikasi: 'klaim-verifikasi'}, ['kode', 'email', 'perangkat']);
