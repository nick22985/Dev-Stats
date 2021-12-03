import { WakaTimeClient, RANGE } from 'wakatime-client';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { DateTime } from "luxon";
dotenv.config();

let wakaaTimeApiKey = process.env.WAKATIMEAPIKEY

async function start() {
	console.log("start")
	const client = await new WakaTimeClient(wakaaTimeApiKey);
	const myUserDetails = await client.getMe();
	const stats = await client.getMyStats({ range: RANGE.LAST_7_DAYS });
	console.log(stats.data)
}

start()