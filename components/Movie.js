const { search, checkIsUp, proxies } = require('piratebay-search')
const { PromptUser } = require('./PromptUser')
const { ShowTorrents } = require('./ShowTorrents')
const { result } = require('./Result')
const { Filter } = require('./Filter')

class Movie {
	constructor(title, sortBySeeders, clipboardMagnetLinks) {
		this.title = title
		this.clipboardMagnetLinks = clipboardMagnetLinks
		this.sortBy = sortBySeeders ? 'seeders' : null
		this.filters = {
			minSeeders: 2,
			minFileSize: 0.1,
			maxFileSize: 30
		}
		this.sortOrder = 'descending'
		this.resultsPageLength = 26
		this.getAndShowTorrents()
	}
	getAndShowTorrents() {
		this.getTorrents().then((results) => {
			results.length === 0
				? console.log('No results :(')
				: this.createTorrentResultPages(new Filter(results, this.filters))
		})
	}
	async getTorrents() {
		if (this.title) {
			return this.searchTorrents()
		} else {
			await new PromptUser().askAll(this.sortBy).then((searchInfo) => {
				Object.assign(this, searchInfo)
			})
			return this.searchTorrents()
		}
	}
	async searchTorrents() {
		let title = this.title
		let minSeeders = this.filters.minSeeders
		let results = []

		await new Promise((resolve) => {
			function searchPage(pageN = 0) {
				console.log(`Searching page ${pageN + 1}...`)
				search(title, {
					baseURL: 'https://thepiratebay.org',
					page: pageN
				}).then((res) => {
					if (res.length > 0 && res[0].seeds >= minSeeders) {
						results.push(...res)
						// only continue if last item is at or above minSeeders
						const lastResultHasMinSeeds = res[res.length - 1].seeds >= minSeeders

						if (lastResultHasMinSeeds) searchPage(pageN + 1)
						else resolve()
					} else resolve()
				})
			}
			searchPage()
		})
		return results
	}
	async createTorrentResultPages(results) {
		const nResults = results.length
		const nextPageLink = { title: '[ Next Page ]', value: 'next' }
		const prevPageLink = { title: '[ Prev Page ]', value: 'prev' }
		const pagesOfChoices = []
		let page = []
		for (let i = 0; i < results.length; i++) {
			const lastOfPage = i % this.resultsPageLength === 0 && i > 0
			const lastOfChoices = i === nResults - 1
			const r = results[i]
			let choice = {
				title:
					result.getFileSizeString(r).join(' ') +
					` | ${r.seeds}s | ${result.getUploadDateString(r)} | ` +
					r.name.trim(),
				value: r.file
			}
			// add previous page link if top of page (but not the first page)
			if (page.length === 0 && i !== 0) page.push(prevPageLink)
			// push choice regardless
			page.push(choice)

			// push current page and clear it for the next one
			if (lastOfPage || lastOfChoices) {
				// if there's more pages, add a next page link
				if (!lastOfChoices) page.push(nextPageLink)
				pagesOfChoices.push(page)
				page = []
			}
		}
		new ShowTorrents(pagesOfChoices, this.clipboardMagnetLinks)
	}
}

module.exports = { Movie }
