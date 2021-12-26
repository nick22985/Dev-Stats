import { WakaTimeClient, RANGE } from "wakatime-client";

async function getWakaStats(waka_api_key) {
	if (waka_api_key == undefined) throw "No Waka Time Api Key Provided";
	let wakaStats = {
		info: {
			userId: undefined,
		},
		timezone: undefined,
		languages: undefined,
		editors: undefined,
		machines: undefined,
		os: undefined,
		projects: undefined,
		categories: undefined,
		totalSeconds: undefined,
		bestDay: {
			date: undefined,
			totalSeconds: undefined,
		},
		dailyAverage: undefined,
	};
	let wakaData = undefined;
	const client = await new WakaTimeClient(waka_api_key);
	wakaData = await client.getMyStats({ range: RANGE.LAST_7_DAYS });
	let wakaUser = await client.getMe();
	wakaStats.userId = wakaData.data.user_id;
	wakaStats.languages = wakaData.data.languages;
	wakaStats.timezone = wakaData.data.timezone;
	wakaStats.editors = wakaData.data.editors;
	wakaStats.machines = wakaData.data.machines;
	wakaStats.projects = wakaData.data.projects;
	wakaStats.os = wakaData.data.operating_systems;
	wakaStats.totalSeconds = wakaData.data.total_seconds;
	wakaStats.categories = wakaData.data.categories;
	wakaStats.bestDay.date = wakaData.data.best_day.date;
	wakaStats.bestDay.totalSeconds = wakaData.data.best_day.total_seconds;
	wakaStats.dailyAverage = wakaData.data.daily_average_including_other_language;
	return wakaStats;
}

export { getWakaStats };
