import Crawler from 'crawler'
import { rmSync, mkdirSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import nhm from 'node-html-markdown'

const { NodeHtmlMarkdown } = nhm

const sites = new Map([
  [
    'blog', {
      path: 'content/blog',
      sitemap: 'https://beyonk.com/_feather/sitemap-posts.xml',
      content: '.notion-page'
    }
  ],
  [
    'support', {
      path: 'content/support',
      sitemap: 'https://support.beyonk.com/sitemap.xml',
      content: '.kb-article'
    }
  ]
])

const urls = new Map()

const c = new Crawler({
    maxConnections: 10,
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const url = urls.get(res.options.uri)

            if (!url) {
              throw new Error(`Unrecognised url ${res.options.uri}`)
            }

            const site = sites.get(url.site)

            const $ = res.$

            if (url.isSitemap) {
              const links = $('loc')
              $(links).each(function(i, link) {
                const href = link.children[0].data
                urls.set(href, {
                  processed: false,
                  site: url.site,
                  isSitemap: false
                })
                c.queue(href)
              })

              return
            }

            const html = $(site.content).html()
            if (!html) { return }
            const filename = new URL(res.options.uri).pathname.replaceAll('/', '_')
            const md = NodeHtmlMarkdown.translate(html)
            writeFileSync(`${join(site.path, filename)}.md`, md, 'utf-8')

            urls.get(res.options.uri).processed = true
        }
        done()
    }
})

for (const [ id, site ] of sites.entries()) {
  console.log(`Crawling ${id}`)
  if (existsSync(site.path)) {
    rmSync(site.path, { recursive: true })
  }
  mkdirSync(site.path, { recursive: true })

  urls.set(site.sitemap, {
    processed: false,
    site: id,
    isSitemap: true
  })
  c.queue(site.sitemap)
}
