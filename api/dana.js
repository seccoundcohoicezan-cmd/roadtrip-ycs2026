const {postHandler} = require('./_lib');
module.exports = postHandler({akses: 'dana-akses', kirim: 'dana-kirim'}, ['kodeAkses', 'nama', 'email', 'wa', 'sekolah', 'kota', 'provinsi', 'ref', 'requestId', 'consent', 'website', 'perangkat']);
