import _ from 'lodash';

let settings = {
	showShortInfo: true,
	showCommits: true,
	showDayOfWeek: true,
	showBreakDown: true,
	showTimeZone: true,
	showEditors: true,
	showLanguages: true,
	showOS: true,
	showHosts: true,

	showLanguagePerRepo: true,
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

function formatRow(leftColum, middleColum, rightColum) {
	leftColum = _.upperFirst(leftColum)
	let ln = leftColum.length
	let lnText = middleColum.length
	return `${leftColum} ${' '.repeat(25 - ln)}${middleColum}${' '.repeat(20 - lnText)}${createGraph(rightColum, settings.graph.bars, settings.graph.graphLength)}   ${_.round(rightColum, 2)}%`
}

async function formatDoc(devStats) {
	let document = ``
	if(settings.showShortInfo) {
		document += `> ${devStats.github.totalContributions} Contributions in the Year of ${devStats.currentDate.c.year}\n>\n`
		+ `> ${formatBytes(devStats.github.personalStats.totalDiskUsage)} Used in GitHub's Storage\n>\n`
		+ `> ${devStats.github.personalStats.isHireable ? `Opted to Hire` : 'Not Opted to Hire'}\n>\n`
		+ `> ${devStats.github.personalStats.repoStats.publicCount} Public Repositories\n>\n`
		+ `> ${devStats.github.personalStats.repoStats.privateCount} Private Repositories\n\n`
	}
	if(settings.showCommits) {
		document += `**I am a ${_.startCase(devStats.github.contributionRepos.biggestTime[0])}**\n\`\`\`text\n`
		devStats.github.contributionRepos.time.forEach(time => {
			time[1] += ' commits'
			document += `${formatRow(...time)}\n`
		});
		document += `\`\`\`\n`
	}
	if(settings.showDayOfWeek) {
		document += `**I'm Most Productive on ${_.startCase(devStats.github.contributionRepos.biggestDay[0])}**\n\`\`\`text\n`
		devStats.github.contributionRepos.days.forEach(day => {
			day[1] += ' commits'
			document += formatRow(...day) + '\n'
		});
		document += `\`\`\`\n`
	}
	if(settings.showBreakDown) {
		document += 'This Week I spent My Time On\n'
		if(settings.showTimeZone) {
			document += `\`\`\`text\n🕒 Time Zone: ${devStats.wakatime.timezone}\n`
		}
		if(settings.showLanguages) {
			document += '\nLanguages:\n'
			devStats.wakatime.languages.forEach(language => {
				if(language.percent >= 1) {
					document += formatRow(language.name, language.text, language.percent) + '\n'
				}
			});
		}
		if(settings.showEditors) {
			document += '\nEditors:\n'
			devStats.wakatime.editors.forEach(editor => {
				document += formatRow(editor.name, editor.text, editor.percent) + '\n'
			});
		}
		if(settings.showOS) {
			document += '\nOperating System:\n'
			devStats.wakatime.os.forEach(os => {
				document += formatRow(os.name, os.text, os.percent) + '\n'
			});
		}
		document += '\`\`\`'
	}

	// ████░░░░░░░░░░░░░░░░░░░░░
	return document;
}



export { formatDoc };