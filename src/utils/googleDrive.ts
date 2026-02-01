/// <reference types="gapi" />
/// <reference types="gapi.client.drive" />
/// <reference types="google.accounts" />

export const SCOPES = 'https://www.googleapis.com/auth/drive.file';
export const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;

export const loadGoogleScripts = (clientId: string, callback: (err?: any) => void) => {
    const checkReady = () => {
        if (gapiInited && gisInited) callback();
    };

    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
        gapi.load('client', async () => {
            try {
                await gapi.client.init({
                    discoveryDocs: [DISCOVERY_DOC],
                });
                gapiInited = true;
                checkReady();
            } catch (e) {
                callback(e);
            }
        });
    };
    document.body.appendChild(gapiScript);

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: SCOPES,
            callback: (_resp: any) => { }, // defined at request time
        });
        gisInited = true;
        checkReady();
    };
    document.body.appendChild(gisScript);
};

export const requestAccessToken = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!tokenClient) return reject('Token Client not initialized');

        // Explicitly cast to any to allow setting callback if types hide it
        const client = tokenClient as any;
        client.callback = (resp: any) => {
            if (resp.error) {
                reject(resp);
            } else {
                resolve();
            }
        };

        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
};

export const findOrCreateFolder = async (folderName: string = 'BearKitchenData'): Promise<string> => {
    const q = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    try {
        const driveStr = 'drive';
        // Cast gapi.client to any to avoid drive type issues if not extended properly
        const response = await (gapi.client as any).drive.files.list({
            q: q,
            fields: 'files(id, name)',
            spaces: driveStr,
        });

        const files = response.result.files;
        if (files && files.length > 0) {
            return files[0].id!;
        }

        const createResp = await (gapi.client as any).drive.files.create({
            resource: {
                name: folderName,
                mimeType: 'application/vnd.google-apps.folder',
            },
            fields: 'id',
        });
        return createResp.result.id!;
    } catch (e) {
        console.error("Error finding folder:", e);
        throw e;
    }
};

export const findFile = async (folderId: string, filename: string): Promise<gapi.client.drive.File | null> => {
    const q = `name='${filename}' and '${folderId}' in parents and trashed=false`;
    const driveStr = 'drive';
    const response = await (gapi.client as any).drive.files.list({
        q: q,
        fields: 'files(id, name, modifiedTime)',
        spaces: driveStr,
    });
    return response.result.files?.[0] || null;
};

export const uploadFile = async (folderId: string, filename: string, content: string, fileId?: string) => {
    const boundary = 'foo_bar_baz';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    const contentType = 'application/json';
    const metadata: any = {
        name: filename,
        mimeType: contentType
    };
    if (!fileId) {
        metadata.parents = [folderId];
    }

    const multipartRequestBody =
        "--" + boundary + "\r\n" +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: ' + contentType + '\r\n\r\n' +
        content +
        close_delim;

    const request = gapi.client.request({
        'path': fileId ? `/upload/drive/v3/files/${fileId}` : '/upload/drive/v3/files',
        'method': fileId ? 'PATCH' : 'POST',
        'params': { 'uploadType': 'multipart' },
        'headers': {
            'Content-Type': 'multipart/related; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
    });

    return request.then((res: any) => res.result);
};

export const downloadFile = async (fileId: string) => {
    const response = await (gapi.client as any).drive.files.get({
        fileId: fileId,
        alt: 'media',
    });
    return response.body;
};

export const getAccessToken = () => {
    return gapi.client.getToken()?.access_token;
};
