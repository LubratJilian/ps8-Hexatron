const http = require("http");

function fetchApiDoc(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => {
                data += chunk;
            });

            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on("error", reject);
    });
}

async function mergeDocs(serviceUrls) {
    let mergedDoc = {
        openapi: "3.0.0",
        info: {
            title: "API Documentation",
            version: "1.0.0"
        },
        paths: {},
        components: {},
        basePath: ""
    };

    for (let url of serviceUrls) {
        try {
            let doc = await fetchApiDoc(url + "/doc");
            Object.assign(mergedDoc.paths, doc.paths);

            if (doc.components) {
                for (let [key, value] of Object.entries(doc.components)) {
                    mergedDoc.components[key] = {
                        ...mergedDoc.components[key],
                        ...value
                    };
                }
            }

        } catch (error) {
            console.error(`Erreur lors de la récupération de ${url}`, error);
        }
    }

    return mergedDoc;
}

async function sendDoc() {
    const doc = await mergeDocs(process.env.SERVICES_URL.split(","));

    const dataToSend = JSON.stringify({path: "./front/swagger-ui-dist/doc.json", file: doc});

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(dataToSend)
        }
    };
    console.log(process.env.FILES_URL);
    const req = http.request(process.env.FILES_URL, options, (res) => {
        let responseData = "";

        res.on("data", (chunk) => {
            responseData += chunk;
        });

        res.on("end", () => {
            console.log("Réponse reçue:", responseData);
            process.exit(0);
        });
    });

    req.on("error", (err) => {
        console.error("Erreur lors de la requête:", err);
    });

    req.write(dataToSend);
    req.end();
    console.log("send");
}

sendDoc().then();
