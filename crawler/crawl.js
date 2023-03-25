import Crawler from 'crawler'
import { convert } from 'html-to-text'
import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

const baseUrl = 'https://support.beyonk.com'

const pages = new Map()
pages.set('index', {
  name: 'index cards page',
  locate: 'links',
  bounds: '.kb-index--cards',
  childType: 'category'
})

pages.set('category', {
  name: 'kb-categories',
  locate: 'links',
  bounds: '.kb-categories',
  childType: 'article'
})

pages.set('article', {
  name: 'kb-categories',
  locate: 'content',
  bounds: '.kb-article'
})

const urls = new Map()
urls.set('/', {
  processed: false,
  type: 'index'
})

const { host: sitePath } = new URL(baseUrl)
if (!existsSync(sitePath)) {
  mkdirSync(sitePath)
}

const c = new Crawler({
    maxConnections: 10,
    callback: (error, res, done) => {
        if (error) {
            console.log(error);
        } else {
            const { pathname } = new URL(res.options.uri, baseUrl)
            const page = urls.get(pathname)
            const mapping = pages.get(page.type)

            if (!mapping) {
              throw new Error(`No mapping found for ${res.options.uri} (${pathname})`)
            }

            const $ = res.$

            const focus = $(mapping.bounds)

            if (mapping.locate === 'links') {
              const links = focus.find('a')
              $(links).each(function(i, link) {
                const href = $(link).attr('href').split('#')[0]
                const url = new URL(href, baseUrl)
                if (url.origin === baseUrl) {
                  urls.set(url.pathname, {
                    processed: false,
                    type: mapping.childType
                  })
                  c.queue(url.toString())
                }
              })
            }

            if (mapping.locate === 'content') {
              const content = convert(focus.html())
              const filename = pathname.replaceAll('/', '_')
              writeFileSync(join(sitePath, filename), content, 'utf-8')
            }
            
            urls.get(pathname).processed = true
            console.log([ ...urls ])
        }
        done()
    }
})

c.queue(baseUrl)
