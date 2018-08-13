/* eslint-env node */

const B2 = require('backblaze-b2');
const MAX_BUFFER = 10000;

class BackBlazeFS {
	constructor(p_BackblazeOptions) {
		this.directories = []; // since backblaze doesn't actually do directories, keep track of any directories that are being created here
		this.bucketId = p_BackblazeOptions.bucketid || process.env.FTP2B2_BUCKETID;
		this.b2 = new B2({
			accountId: p_BackblazeOptions.accoundId || process.env.FTP2B2_ACCOUNTID,
			applicationKey: p_BackblazeOptions.applicationKey || process.env.FTP2B2_APPLICATIONKEY,
		});
		this.fileListCache = [];
	}

	appendFileListCache(p_NewFiles) {
		p_NewFiles.forEach((p_File) => {
			if (!this.fileListCache.find((p_TestFile) => p_TestFile.fileName === p_File.fileName)) {
				this.fileListCache.push(p_File);
				if (this.fileListCache.length > MAX_BUFFER) {
					this.fileListCache.shift();
				}
			}
		});
	}

	async close(p_FileDescriptor, p_Callback) {
		console.log('calling >> close');
	}

	async createReadStream(p_Path, p_Options) {
		console.log(`calling >> createReadStream(${p_Path})`);
	}

	async createWriteStream(p_Path, p_Options) {
		console.log(`calling >> createWriteStream(${p_Path})`);
	}

	async mkdir(p_Path, ...p_Callbacks) {
		console.log(`calling >> mkdir(${p_Path})`);
		if (this.directories.indexOf(p_Path) === -1) {
			this.directories.push(p_Path);
		}
		p_Callbacks.slice(-1)[0](null);
	}

	async open(p_Path, p_Flags, ...p_Callbacks) {
		console.log(`calling >> open(${p_Path})`);
	}

	async readdir(p_Path, ...p_Callbacks) {
		console.log(`calling >> readdir(${p_Path})`);
		let err = null;
		let files = [];
		try {
			await this.b2.authorize();
			const path = (p_Path === '/') ? '' : `${p_Path.replace(/^\//, '')}/`;
			const response = await this.b2.listFileNames({
				bucketId: this.bucketId,
				maxFileCount: 100,
				delimiter: '/',
				prefix: path,
			});

			this.appendFileListCache(response.data.files.slice());
			files = response.data.files.map((p_FileData) => p_FileData.fileName.substr(path.length));
		} catch (p_Error) {
			err = p_Error;
		}
		p_Callbacks.slice(-1)[0](err, files);
	}

	async readFile(p_Path, ...p_CallBacks) {
		console.log(`calling >> readFile(${p_Path})`);
		await this.b2.authorize();
	}

	async rename(p_OldPath, p_NewPath, p_Callback) {
		console.log(`calling >> rename(${p_OldPath}, ${p_NewPath})`);

	}

	async rmdir(p_Path, p_Callback) {
		console.log(`calling >> rmdir(${p_Path})`);
	}

	async stat(p_Path, ...p_Callbacks) {
		const backBlazePath = p_Path.replace(/^\//, '');
		console.log(`calling >> stat(${p_Path})`);
		let result = {};
		const base = {
			dev: 38,
			mode: 16877,
			nlink: 19,
			uid: 0,
			gid: 0,
			rdev: 0,
			blksize: 4096,
			ino: 6184580,
			size: 646,
			blocks: 0,
		};
		let err = null;
		const isDir = p_Path === '/' || this.directories.indexOf(p_Path) !== -1 || /\/$/.test(p_Path);
		if (isDir) {
			console.log('isDir');
			const fileTime = new Date();
			result = Object.assign({}, base, {
				atime: fileTime,
				mtime: fileTime,
				ctime: fileTime,
				birthtime: fileTime,
				isFile() { return false; },
				isDirectory() { return true; },
				isBlockDevice() { return false; },
				isCharacterDevice() { return false; },
				isSymbolicLink() { return false; },
				isFIFO() { return false; },
				isSocket() { return false; },
			});
			console.log(`callback from fake: ${JSON.stringify(result)}`);
		} else {
			try {
				let fileInfo = this.fileListCache.find((p_FileData) => backBlazePath === p_FileData.fileName);
				if (!fileInfo) {
					await this.b2.authorize();

					const response = await this.b2.listFileNames({
						bucketId: this.bucketId,
						startFileName: '',
						maxFileCount: 1,
						delimiter: '/',
						prefix: backBlazePath,
					});

					console.log(JSON.stringify(response.data));

					if (response.data.files.length) {
						this.appendFileListCache(response.data.files.slice());
						fileInfo = response.data.files[0];
					}
					console.log('using new retrieve');
				} else {
					console.log('using cache');
				}
				if (fileInfo) {
					const fileTime = new Date(fileInfo.uploadTimestamp);
					const isFile = fileInfo.action !== 'folder';
					result = Object.assign({}, base, {
						size: fileInfo.size,
						atime: fileTime,
						mtime: fileTime,
						ctime: fileTime,
						birthtime: fileTime,
						isFile() { return isFile; },
						isDirectory() { return !isFile; },
						isBlockDevice() { return false; },
						isCharacterDevice() { return false; },
						isSymbolicLink() { return false; },
						isFIFO() { return false; },
						isSocket() { return false; },
					});
					console.log(`callback from retrieve: ${JSON.stringify(result)}`);
				} else {
					err = new Error(`File or folder ${p_Path} does not exist`);
					err.code = 'ENOENT';
				}
			} catch (p_Error) {
				err = p_Error;
			}
		}

		p_Callbacks.slice(-1)[0](err, result);
	}

	async unlink(p_Path, p_Callback) {
		console.log(`calling >> unlink(${p_Path})`);
	}

	async writeFile(p_Path, p_Data, ...p_Callbacks) {
		console.log(`calling >> writefile(${p_Path})`);
		let err = '';
		try {
			await this.b2.authorize();
			const uploadUrl = await this.b2.getUploadUrl(this.bucketId);
			console.log(uploadUrl);

			const response = await this.b2.uploadFile({
				uploadUrl: uploadUrl.data.uploadUrl,
				uploadAuthToken: uploadUrl.data.authorizationToken,
				filename: p_Path.replace(/^\//, ''),
				data: p_Data,
			});

			console.log(response.data);
		} catch (p_Error) {
			err = p_Error;
		}
		p_Callbacks.slice(-1)[0](err);
	}
}

module.exports = BackBlazeFS;
