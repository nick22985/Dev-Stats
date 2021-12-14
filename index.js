import * as dotenv from "dotenv";
import chalk from "chalk";
import {DateTime, Settings} from "luxon"; // Not needed maybe?
import {getWakaStats} from "./lib/waka.js";
import {getGithubStats, updateReadme} from "./lib/github.js";
import {formatDoc} from "./lib/fomratting.js";
import {stringify} from "querystring";

dotenv.config();

let wakatime_api_key = process.env.WAKATIME_API_KEY;
let gh_token = process.env.GH_TOKEN;

let settings = {
	showShortInfo: process.env.SHOW_SHORT_INFO,
	showCommits: process.env.SHOW_COMITS,
	showDayOfWeek: process.env.SHOW_DAY_OF_WEEK,
	showBreakDown: process.env.SHOW_BREAK_DOWN,
	showTimeZone: process.env.SHOW_TIMEZONE,
	showEditors: process.env.SHOW_EDITORS,
	showLanguages: process.env.SHOW_LANGUAGES,
	showOS: process.env.SHOW_OS,
	showHosts: process.env.SHOW_HOSTS,
	showLanguagePerRepo: process.env.SHOW_LANGUAGE_PER_REPO,
	showProjects: process.env.SHOW_PROJECTS,
	excludeProjects: process.env.EXCLUDE_PROJECT,
	graph: ["█░", 25],
	entryPoints: {
		start: "<!--START_SECTION:devStats-->",
		end: "<!--END_SECTION:devStats-->",
	},
};

async function start() {
	let devStats = {
		github: {},
		wakatime: {},
		currentDate: undefined,
	};

	try {
		if (wakatime_api_key == undefined) throw "No WakaTime Api Key Provided";
		if (gh_token == undefined) throw "No Github Token Provided";
		console.log("start");
		console.log(chalk.white.bold("WakaStats"));
		devStats.wakatime = await getWakaStats(wakatime_api_key);
		console.log("Github Stats");
		devStats.github = await getGithubStats(devStats.wakatime.timezone, gh_token);
		console.log("Api Calls Completed");
		Settings.defaultZoneName = devStats.wakatime.timezone;
		devStats.currentDate = DateTime.local();
		if (settings.excludeProjects) {
			settings.excludeProjects = settings.excludeProjects.split(", ");
		}
		let formatted = await formatDoc(devStats, settings);
		console.log(formatted);
		updateReadme(gh_token, devStats.github.userInfo, settings.entryPoints, formatted);
	} catch (e) {
		console.log(e);
	}
}

start();
