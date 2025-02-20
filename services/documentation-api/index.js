const http = require("http");

let mergedDocOptions = {
    openapi: "3.0.0",
    info: {
        title: "API Documentation",
        version: "1.0.0"
    },
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
            if (Object.keys(doc).length !== 0)
                Object.assign(mergedDocOptions.paths, doc.paths);
            if (doc.components) {
                for (let [key, value] of Object.entries(doc.components)) {
                    mergedDocOptions.components[key] = {
                        ...mergedDocOptions.components[key],
                        ...value
                    };
                }
            }
        } catch (error) {
            console.error(`Erreur lors de la récupération de ${url}`, error);
        }
    }
}

async function sendDoc() {
    await mergeDocs(process.env.SERVICES_URL.split(","));

    let documentation = JSON.stringify(mergedDocOptions);
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
