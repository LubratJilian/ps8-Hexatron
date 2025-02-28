const http = require("http");

let mergedDoc = {
    openapi: "3.0.0",
    info: {
        title: "API Documentation",
        version: "1.0.0"
    },
    tags: {},
    paths: {},
    components: {},
    basePath: "/api"
};

async function fetchApiDoc(url) {
    return new Promise((resolve, reject) => {
        let request = http.get(url, {timeout: 1000}, (response) => {
            let data = "";
            response.on("data", (chunk) => {
                data += chunk;
            });

            response.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        });

        request.on("timeout", () => {
            request.destroy();
            console.error(`Timeout exceeded, documentation of ${url} not fetch`);
            resolve({});
        });

        request.on("error", reject);
    });
}

async function mergeDocs(serviceUrls) {
    for (let url of serviceUrls) {
        try {
            let doc = await fetchApiDoc(url + "/doc");
            if (Object.keys(doc).length !== 0) {
                Object.assign(mergedDoc.tags, doc.tags);
                Object.assign(mergedDoc.paths, doc.paths);
            }
            for (let componentKey of Object.keys(doc.components)) {
                if (!Object.hasOwnProperty(mergedDoc.components[componentKey])) {
                    mergedDoc.components[componentKey] = {};
                }
                for (let [key, value] of Object.entries(doc.components[componentKey])) {
                    if (!(key in mergedDoc.components[componentKey])) {
                        mergedDoc.components[componentKey][key] = value;
                    }
                }
            }
            console.log(`Documentation of ${url} received: ${doc}`);
        } catch (error) {
            console.error(`Error during retrieval of ${url}`, error);
        }
    }
}

async function sendDoc() {
    await mergeDocs(process.env.SERVICES_URL.split(","));

    let documentation = JSON.stringify(mergedDoc);
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(documentation)
        }
    };

    const req = http.request(process.env.FILES_URL, options, (response) => {
        let responseData = "";

        response.on("data", (chunk) => {
            responseData += chunk;
        });

        response.on("end", () => {
            if (response.statusCode === 201) {
                console.log("File received by files service");
            } else {
                console.error(`Error: HTTP status Code ${response.statusCode}`);
            }
            process.exit(0);
        });
    });

    req.on("error", (err) => {
        console.error("Error during transmission: ", err);
        process.exit(0);
    });

    req.write(documentation);
    req.end();
}

sendDoc().then();
