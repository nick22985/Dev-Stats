import _ from 'lodash';

let settings = {
	personalStats: true,
	SHOW_COMMIT: true,
	SHOW_DAYS_OF_WEEK: true,
	graph: {
		bars: '█░', //TODO: Implement more bars
		graphLength: 25,
	},
	rowLength: 80,
}

function createGraph(percent, blocks, length) {
	if (blocks.length < 2) {
		throw "You need at least 2 blocks in a graph"
	}
	let divs = blocks.length - 1
	let graph = blocks[0].repeat(parseFloat(percent / 100 * length / divs))
	let remainingBlocks = parseFloat((percent / 100 * length - graph.length) * divs)
	graph += blocks[blocks.length-1].repeat(length - graph.length)
	return graph
}

function formatBytes(bytes, decimals = 2) {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const dm = decimals < 0 ? 0 : decimals;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function formatRow(row) {
	let ln = row[0].length
	let lnText = (row[1].toString()).length
	return `${_.startCase(row[0])} ${' '.repeat(25 -ln)}${row[1]}${' '.repeat(20 - lnText)}${createGraph(row.percent, settings.graph.bars, settings.graph.graphLength)}   ${_.round(row.percent, 1)}%`
}

async function formatDoc(devStats) {
	let document = ``
	if(settings.personalStats) {
		document += `${devStats.github.totalContributions} Contributions in the Year of ${devStats.currentDate.c.year}\n`
		+ `${formatBytes(devStats.github.personalStats.totalDiskUsage)} Used in GitHub's Storage\n`
		+ `${devStats.github.personalStats.isHireable ? `Opted to Hire` : 'Not Opted to Hire'}\n`
		+ `${devStats.github.personalStats.repoStats.publicCount} Public Repositories\n`
		+ `${devStats.github.personalStats.repoStats.privateCount} Private Repositories\n\n`
	}
	if(settings.SHOW_COMMIT) {
		document += `**I am a ${_.startCase(devStats.github.contributionRepos.biggestTime[0])}**\n\`\`\`text\n`
		devStats.github.contributionRepos.time.forEach(time => {
			time[1] += ' commits'
			document += `${formatRow(time)}\n`
		});
		document += `\`\`\`\n`
	}
	if(settings.SHOW_DAYS_OF_WEEK) {
		document += `**I'm Most Productive on ${_.startCase(devStats.github.contributionRepos.biggestDay[0])}**\n\`\`\`text\n`
		devStats.github.contributionRepos.days.forEach(day => {
			day[1] += ' commits'
			document += formatRow(day) + '\n'
		});
		document += `\`\`\`\n`
	}

	// ████░░░░░░░░░░░░░░░░░░░░░
	return document;
}



export { formatDoc };