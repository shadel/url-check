const { default: axios } = require("axios");
const inputData = require("./input.json");
const fs = require("fs");
const { PromisePool } = require('@supercharge/promise-pool');

async function run() {
    const { baseUrl, list, parallel } = inputData;


    const urlList = list.map(filePath => [`${baseUrl}${filePath}`, `${baseUrl}${filePath.replace("orignial_", "")}`]).flat();

    const { results, errors } = await PromisePool.withConcurrency(parallel || 5).for(urlList).process(async url => {
        console.log(`Checking ${url} ...`);
        const res = await downloadFromHttp(url);
        console.log(`Checking ${url} finish: ${res.success}`);
        return res;
    });
    console.log({ results, errors });

    const failed = results.filter(({ success }) => !success).map((url) => url);
    const success = results.filter(({ success }) => success).map((url) => url);

    fs.writeFileSync("output.json", JSON.stringify({ failed, success, errors }));

}


async function downloadFromHttp(url, retry = 0) {
    if (!url) {
        return;
    }
    try {

        const base64 = await axios
            .get(url, {
                responseType: 'arraybuffer'
            })
            .then(response => Buffer.from(response.data, 'binary').toString('base64'))

        return { url, success: true };
    } catch (error) {
        if (retry >= 20) {
            return { url, success: false };
        }
        return await downloadFromHttp(url, retry + 1)
    }
}

run();