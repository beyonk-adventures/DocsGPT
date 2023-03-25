import Crawler from 'crawler'
import { rmSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import nhm from 'node-html-markdown'

const { NodeHtmlMarkdown, NodeHtmlMarkdownOptions } = nhm

const sites = new Map([
  [
    'support', {
      baseUrl: 'https://support.beyonk.com',
      path: 'support',
      pages: new Map([
        [
          'index', {
            name: 'index cards page',
            locate: 'links',
            bounds: '.kb-index--cards',
            childType: 'category'
          }
        ],
        [
          'category', {
            name: 'kb-categories',
            locate: 'links',
            bounds: '.kb-categories',
            childType: 'article'
          }
        ],
        [
          'article', {
            name: 'kb-categories',
            locate: 'content',
            bounds: '.kb-article'
          }
        ]
      ])
    },
    'blog', {
      baseUrl: 'https://beyonk.com/blog',
      path: 'support',
      pages: new Map([
        [
          'index', {
            name: 'index cards page',
            locate: 'links',
            bounds: '.kb-index--cards',
            childType: 'category'
          }
        ],
        [
          'category', {
            name: 'kb-categories',
            locate: 'links',
            bounds: '.kb-categories',
            childType: 'article'
          }
        ],
        [
          'article', {
            name: 'kb-categories',
            locate: 'content',
            bounds: '.kb-article'
          }
        ]
      ])
    }
  ]
])

// const sites = new Map([
//   [
//     'blog', {
//       baseUrl: 'https://beyonk.com/blog',
//     }
//   ]
// ])

const urls = new Map()

const c = new Crawler({
    maxConnections: 10,
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const visit = new URL(res.options.uri, res.options.host).toString()
            const url = urls.get(visit)
            const site = sites.get(url.site)
            const mapping = site.pages.get(url.type)

            if (!mapping) {
              throw new Error(`No mapping found for ${res.options.uri} (${pathname})`)
            }

            const $ = res.$
            const focus = $(mapping.bounds)

            if (mapping.locate === 'links') {
              const links = focus.find('a')
              $(links).each(function(i, link) {
                const href = $(link).attr('href').split('#')[0]
                const absolute = new URL(href, site.baseUrl)
                if (absolute.origin === site.baseUrl) {
                  urls.set(absolute.toString(), {
                    processed: false,
                    type: mapping.childType,
                    site: url.site
                  })
                  c.queue(absolute.toString())
                }
              })
            }

            if (mapping.locate === 'content') {
              const html = focus.html()
              if (!html) { return }
              const filename = new URL(visit).pathname.replaceAll('/', '_')
              writeFileSync(`${join('html', site.path, filename)}.html`, html, 'utf-8')
              const md = NodeHtmlMarkdown.translate(
                html
              )
              writeFileSync(`${join('md', site.path, filename)}.md`, md, 'utf-8')
            }
            
            urls.get(visit).processed = true
        }
        done()
    }
})

for (const [ id, site ] of sites.entries()) {
  console.log(`Crawling ${site.baseUrl} to [html|md]/${site.path}`)

  for (const filetype of [ 'html', 'md' ]) {
    const output = join(filetype, site.path)
    rmSync(output, { recursive: true })
    mkdirSync(output, { recursive: true })
  }

  const absolute = new URL('/', site.baseUrl)
  urls.set(absolute.toString(), {
    processed: false,
    type: 'index',
    site: id
  })
  c.queue(site.baseUrl)
}
