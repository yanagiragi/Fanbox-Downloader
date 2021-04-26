const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const util = require('util')
const streamPipeline = util.promisify(require('stream').pipeline)

const id = process.env.id
const cookie = process.env.session

function FetchWrapper(url) {
    return fetch(url, {
        "headers": {
            "Accept-Encoding": "gzip, deflate, br",
            "Referer": `https://${id}.fanbox.cc/`,
            "Origin": `https://${id}.fanbox.cc`,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:87.0) Gecko/20100101 Firefox/87.0",
            "Accept": "application/json, text/plain, */*",
            "Accept-Language": "zh-TW,zh;q=0.8,en-US;q=0.5,en;q=0.3",
            "Pragma": "no-cache",
            "Cache-Control": "no-cache",
            "Cookie": cookie
        },
        "referrer": `https://${id}.fanbox.cc/`,
        "method": "GET",
    });
}

async function main()
{
    const fetchInternal = async (url, container) => {
        if (url == undefined) {
            return container
        }

        const resp = await FetchWrapper(url)
        const data = await resp.json()
        
        if (data.body.items.length == 0) {
            return container
        }

        const posts = data.body.items.map(x => {            
            return {
                'title': x.title,
                'images': [ 
                    x.body?.images?.map(el => el.originalUrl), 
                    Object.values(x.body?.imageMap ?? []).map(el => el.originalUrl),
                    x.body?.files?.map(x => x.url), 
                ].filter(Boolean).flat()
            }
        })

        return fetchInternal(data.nextUrl, [posts.filter(x => x.images.length > 0), container].flat())
    }

    const results = await fetchInternal(`https://api.fanbox.cc/post.listCreator?creatorId=${id}&limit=100`, [])

    return await Deal(results)    
}

async function FetchImage (url, filename) {
    try {
        if (fs.existsSync(filename)) return false
		const resp = await FetchWrapper(url)
        if (!resp.ok) throw new Error(`Error When Downloading ${url}`)
		await streamPipeline(await resp.body, fs.createWriteStream(filename))
	} catch (error) {
		console.log(`Error when download ${url}`)
		return false
	}

	return true
}

async function Deal(results) {

    if (!fs.existsSync('Storage')) {
        fs.mkdirSync('Storage')
    }

    for(const result of results) {
        console.log(`Download ${result.title} [${result.images.length}]`)

        const folderPath = path.join('Storage', result.title)
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath)
        }

        for(const image of result.images) {

            console.log(`\t Downloading ${image}`)
            
            const matched = image.match(/\/([a-zA-Z0-9]+\.[a-zA-Z0-9]+$)/)
            const savename = matched[0]
            await FetchImage(image, path.join(folderPath, savename.substring(1)))
        }
    }
}

main()