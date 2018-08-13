/* eslint-env node */

const ftpd = require('ftpd');
const BackBlazeFS = require('./backblaze-fs');
const fs = require('fs');
const path = require('path');
let keyFile;
let certFile;

let optionFile = { backblaze: {}, ftp: {} };

try {
	if (fs.existsSync('./config.json')) {
		optionFile = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
		optionFile.ftp = optionFile.ftp || {};
		optionFile.backblaze = optionFile.backblaze || {};
	}
} catch (p_Error) {
	console.log('Invalid config file');
}

const configKeyFile = optionFile.ftp.keyFile || process.env.FTP2B2_KEY_FILE;
const configCertFile = optionFile.ftp.certFile || process.env.FTP2B2_CERT_FILE;
const configCaFiles = optionFile.ftp.caFiles || process.env.FTP2B2_CA_FILES;

const options = {
	host: optionFile.ftp.ip || process.env.FTP2B2_IP || '127.0.0.1',
	port: optionFile.ftp.port || process.env.FTP2B2_PORT || 7002,
	tls: null,
};

if (configKeyFile && configCertFile) {
	console.log('Running as FTPS server');
	if (configKeyFile.charAt(0) !== '/') {
		keyFile = path.join(__dirname, configKeyFile);
	}
	if (configCertFile.charAt(0) !== '/') {
		certFile = path.join(__dirname, configCertFile);
	}

	options.tls = {
		key: fs.readFileSync(keyFile),
		cert: fs.readFileSync(certFile),
		ca: (!configCaFiles) ? null : configCaFiles.split(':').map((p_File) => fs.readFileSync(p_File)),
	};
} else {
	console.log();
	console.log('*** To run as FTPS server,                 ***');
	console.log('***  set "KEY_FILE", "CERT_FILE"           ***');
	console.log('***  and (optionally) "CA_FILES" env vars. ***');
	console.log();
}

const server = new ftpd.FtpServer(options.host, {
	getInitialCwd: () => '/',
	getRoot: () => '/',
	pasvPortRangeStart: 1025,
	pasvPortRangeEnd: 1050,
	tlsOptions: options.tls,
	allowUnauthorizedTls: true,
	useWriteFile: true,
	useReadFile: true,
	maxStatsAtOnce: 1,
	uploadMaxSlurpSize: 7000000, // N/A unless 'useWriteFile' is true.
});

server.on('error', (error) => {
	console.log('FTP Server error:', error);
});

server.on('client:connected', (connection) => {
	let username = null;
	console.log(`client connected: ${connection.remoteAddress}`);
	connection.on('command:user', (user, success, failure) => {
		if (user && (!optionFile.ftp.username || user === optionFile.ftp.username)) {
			username = user;
			success();
		} else {
			failure();
		}
	});

	connection.on('command:pass', (pass, success, failure) => {
		if (pass && (!optionFile.ftp.username || username === optionFile.ftp.username) && (!optionFile.ftp.password || pass === optionFile.ftp.password)) {
			const fsInstance = new BackBlazeFS(optionFile.backblaze);
			success(username, fsInstance);
		} else {
			failure(new Error('invalid user name or password'));
		}
	});
});

server.debugging = 4;
server.listen(options.port);
console.log(`Listening on port ${options.port}`);

