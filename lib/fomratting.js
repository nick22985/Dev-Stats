import _ from 'lodash';

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

function formatRow(leftColum, middleColum, rightColum, bars, graphLn) {
	leftColum = _.upperFirst(leftColum)
	let ln = leftColum.length
	let lnText = middleColum.length
	return `${leftColum} ${' '.repeat(25 - ln)}${middleColum}${' '.repeat(20 - lnText)}${createGraph(rightColum, bars, graphLn)}   ${_.round(rightColum, 2)}%`
}


async function formatDoc(devStats, settings) {
	let document = ``
	if(settings.showShortInfo) {
		document += `> ${devStats.github.totalContributions} Contributions in the Year of ${devStats.currentDate.c.year}\n>\n`
		+ `> ${formatBytes(devStats.github.personalStats.totalDiskUsage)} Used in GitHub's Storage\n>\n`
		+ `> ${devStats.github.personalStats.isHireable ? `Opted to Hire` : 'Not Opted to Hire'}\n>\n`
		+ `> ${devStats.github.personalStats.repoStats.publicCount} Public Repositories\n>\n`
		+ `> ${devStats.github.personalStats.repoStats.privateCount} Private Repositories\n\n`
	}
	if(settings.showCommits) {
		document += `**I Mostly code in the ${_.startCase(devStats.github.contributionRepos.biggestTime[0])}**\n\`\`\`text\n`
		devStats.github.contributionRepos.time.forEach(time => {
			time[1] += ' commits'
			document += `${formatRow(...time, ...settings.graph)}\n`
		});
		document += `\`\`\`\n`
	}
	if(settings.showDayOfWeek) {
		document += `**I'm Most Productive on ${_.startCase(devStats.github.contributionRepos.biggestDay[0])}**\n\`\`\`text\n`
		devStats.github.contributionRepos.days.forEach(day => {
			day[1] += ' commits'
			document += formatRow(...day, ...settings.graph) + '\n'
		});
		document += `\`\`\`\n`
	}
	if(settings.showBreakDown) {
		document += 'This Week I spent My Time On:\n'
		if(settings.showTimeZone) {
			document += `\`\`\`text\n🕒 Time Zone: ${devStats.wakatime.timezone}\n`
		}
		if(settings.showLanguages) {
			document += '\nLanguages:\n'
			devStats.wakatime.languages.forEach(language => {
				if(language.percent >= 1) {
					document += formatRow(language.name, language.text, language.percent, ...settings.graph) + '\n'
				}
			});
		}
		if(settings.showEditors) {
			document += '\nEditors:\n'
			devStats.wakatime.editors.forEach(editor => {
				document += formatRow(editor.name, editor.text, editor.percent, ...settings.graph) + '\n'
			});
		}
		if(settings.showOS) {
			document += '\nOperating System:\n'
			devStats.wakatime.os.forEach(os => {
				document += formatRow(os.name, os.text, os.percent, ...settings.graph) + '\n'
			});
		}
		document += '\`\`\`\n'
	}

	if(settings.showLanguagePerRepo) {
		document += `I mostly coded in ${devStats.github.personalStats.repoStats.languages[0][0]}:\n\`\`\`text\n`
		devStats.github.personalStats.repoStats.languages.forEach(lang => {
			if(lang[0] != 'undefined') {
				lang[1] += ' repos'
				document += formatRow(...lang, ...settings.graph) + '\n'
			}
		});
		document += '\`\`\`'
	}
	if(settings.showProjects) {
		document += `\nProjects:\n\`\`\`text\n`
		if(settings.excludeProjects) {
			settings.excludeProjects.forEach(exclude => {
				// console.log(exclude)
				devStats.wakatime.projects = devStats.wakatime.projects.filter(project => project.name != exclude)
			});
		}
		devStats.wakatime.projects.forEach(project => {
			if(project.percent >= 1) {
				document += formatRow(project.name, project.text, project.percent, ...settings.graph) + '\n'
			}
		});
		document += '\`\`\`'
	}

	return document;
}



export { formatDoc };