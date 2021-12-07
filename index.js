import * as fs from 'fs';
import * as dotenv from 'dotenv';
import chalk from 'chalk';
import { DateTime } from "luxon"; // Not needed maybe?

import {getWakaStats} from './lib/waka.js'
import {getGithubStats} from './lib/github.js'
import {formatDoc} from './lib/fomratting.js'

dotenv.config();


let wakatime_api_key = process.env.WAKATIME_API_KEY;
let gh_token = process.env.GH_TOKEN;

async function start() {
	let devStats = {
		github: {},
		wakatime:{}
	}
	try {
		if(wakatime_api_key == undefined) throw "No WakaTime Api Key Provided"
		if(gh_token == undefined) throw "No Github Token Provided"
		console.log("start")
		console.log(chalk.white.bold("WakaStats"))
		devStats.wakatime = await getWakaStats(wakatime_api_key)
		console.log("Github Stats")
		devStats.github = await getGithubStats(devStats.wakatime.timezone, gh_token)
		console.log("Api Calls Completed")
		let formatted = formatDoc(devStats)
		console.log(formatted)
	}
	catch (e){console.log(e)}


}



start()


