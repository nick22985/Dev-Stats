import fs from 'fs';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { DateTime, Settings } from "luxon"; // Not needed maybe?
import {getWakaStats} from './lib/waka.js'
import {getGithubStats} from './lib/github.js'
import {formatDoc} from './lib/fomratting.js'
import { stringify } from 'querystring';

import staticDevStats from './data/devStats.json'

dotenv.config();

let dev = false;
let staticCapture = true;


let wakatime_api_key = process.env.WAKATIME_API_KEY;
let gh_token = process.env.GH_TOKEN;

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
	showProjects: true,
	excludeProjects: process.env.EXCLUDE_PROJECT,
	graph: [
		'█░',
		25
	],
	rowLength: 80,
}

async function start() {
	let devStats = {
		github: {},
		wakatime:{},
		currentDate: undefined,
	}
	try {
		if(wakatime_api_key == undefined) throw "No WakaTime Api Key Provided"
		if(gh_token == undefined) throw "No Github Token Provided"
		console.log("start")
		console.log(chalk.white.bold("WakaStats"))
		if(dev) {
			devStats = staticDevStats
		} else {
			devStats.wakatime = await getWakaStats(wakatime_api_key)
			console.log("Github Stats")
			devStats.github = await getGithubStats(devStats.wakatime.timezone, gh_token)
			console.log("Api Calls Completed")
			if(staticCapture && !dev && devStats.github && devStats.wakatime) {
				writeFile("./data/devStats.json", JSON.stringify(devStats))
			}
		}

		Settings.defaultZoneName = devStats.wakatime.timezone;
		devStats.currentDate = DateTime.local()
		if(settings.excludeProjects) {
			settings.excludeProjects = settings.excludeProjects.split(', ')
			console.log(settings.excludeProjects)
		}
		let formatted = await formatDoc(devStats, settings)
		writeFile('./format.md', formatted)
		console.log(formatted)
	}
	catch (e){console.log(e)}
}


function writeFile(filename, content) {
	fs.writeFile(filename, content, err => {
		if (err) {
		  console.error(err)
		  return
		}
		//file written successfully
	  })
}


start()


