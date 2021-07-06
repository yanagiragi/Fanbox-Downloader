const fetch = require('node-fetch')
const fs = require('fs')
const path = require('path')
const util = require('util')
const sanitize = require("sanitize-filename");
const streamPipeline = util.promisify(require('stream').pipeline)

const id = process.env.id
const session = process.env.session

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
            "Cookie": `FANBOXSESSID=${session};`
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

        console.log(`Fetching ${url}`)

        try {
            const resp = await FetchWrapper(url)
            const data = await resp.json()

            if (data.body.items.length == 0) {
                return container
            }
    
            const posts = data.body.items.map(x => ({                
                'id': x.id,
                'title': x.title,
                'cover': x.coverImageUrl,
                'images': [ 
                    x.body?.images?.map(el => el.originalUrl), 
                    Object.values(x.body?.imageMap ?? []).map(el => el.originalUrl),
                    x.body?.files?.map(x => x.url), 
                ].filter(Boolean).flat()                
            }))
    
            return fetchInternal(data.body.nextUrl, [posts, container].flat())
        } catch (error) {
            console.error("Error Occurs.")
            console.error(`Raw = ${error}`)
            return []
        }        
    }

    const results = await fetchInternal(`https://api.fanbox.cc/post.listCreator?creatorId=${id}&limit=100`, [])

    await Deal(results)    
}

async function FetchImage (url, filename) {
    try {
        const resp = await FetchWrapper(url)
        if (!resp.ok) {
            throw new Error(`Error When Downloading ${url}`)
        } 
        await streamPipeline(await resp.body, fs.createWriteStream(filename))
	} catch (error) {
		console.log(`Error when download ${url}, error = ${error}`)
		return false
	}

	return true
}

async function Download(image, filename)
{
    if (fs.existsSync(filename)) {
        console.log(`\t\t Skiped: ${image}`)
        return
    }
    const result = await FetchImage(image, filename)
    if (result)
        console.log(`\t\t Downloaded: ${image}`)
    else
        console.log(`\t\t Error: ${image}`)
}

async function Deal(results) {

    if (!fs.existsSync('Storage')) {
        fs.mkdirSync('Storage')
    }

    if (!fs.existsSync(path.join('Storage', id))) {
        fs.mkdirSync(path.join('Storage', id))
    }

    for (const result of results) {
        console.log(`Download ${result.title} [${result.images.length}]`)

        const folderPath = path.join('Storage', id, `${result.id}-${sanitize(result.title)}`)
        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath)
        }

        if (result.cover) {
            console.log(`\t Downloading Cover: ${JSON.stringify(result)}`)
            const matched = result.cover.match(/\/([a-zA-Z0-9]+\.[a-zA-Z0-9]+$)/)
            const savename = matched[0]
            const filename = path.join(folderPath, `cover-${savename.substring(1)}`)
            await Download(result.cover, filename)
        }

        for(const image of result.images) {
            console.log(`\t Downloading ${image}`)
            const matched = image.match(/\/([a-zA-Z0-9]+\.[a-zA-Z0-9]+$)/)
            const savename = matched[0]
            const filename = path.join(folderPath, savename.substring(1))
            await Download(image, filename)
        }
    }
}

if (id == null || session == null) {
    console.log('No Id and session provided. Abort.')
}
else {
    main()
}