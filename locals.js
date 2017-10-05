const fs = require('fs')
const path = require('path')
const Gettext = require('node-gettext')
const po = require('gettext-parser').po

const translationsDir = './lang/'
const locales = ['en_US','zh_CN']

const gt = new Gettext()
global._ = gt;

locales.forEach((locale) => {
    const fileName = `${locale}.po`
    const translationsFilePath = path.join(translationsDir, fileName)
		const translationsContent = fs.readFileSync(translationsFilePath, 'utf8')

    const parsedTranslations = po.parse(translationsContent)
    gt.addTranslations(locale, 'messages', parsedTranslations)
})

gt.setLocale('en_US')
console.log(_.gettext("Remove"))
