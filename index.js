import { WakaTimeClient, RANGE } from 'wakatime-client';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';
import { DateTime } from "luxon";
import { getWakaDataStatic } from './devData/wakatime.js';

dotenv.config();

let wakaaTimeApiKey = process.env.WAKATIMEAPIKEY
let githubToken = process.env.GITHUBTOKEN


async function start() {
	let devStats = {
		github: {},
		wakatime:{}
	}
	console.log("start")
	devStats.wakatime = await getWakaStats()
	devStats.github = await getGithubStats(devStats.timeZone)
	console.log(devStats)
}

async function getWakaStats() {
	let dev = true;
	if(dev) {
		return getWakaDataStatic()
	} else {
		const client = await new WakaTimeClient(wakaaTimeApiKey);
		// const myUserDetails = await client.getMe();
		const stats = await client.getMyStats({ range: RANGE.LAST_7_DAYS });
		return stats.data
	}

}

const getUserInfomationQuery = `
	query {
		viewer {
			login
			email
			id
		}
	}`;

const getContributedReposQuery = `
	query($username:String!) {
		user(login: $username) {
			repositoriesContributedTo(last: 100, includeUserRepositories: true) {
				nodes {
					isFork
					name
					owner {
						login
					}
				}
			}
		}
	}
`
// {"username": "nick22985", "id": "MDQ6VXNlcjQzNzc0NzEz"}
const getCommitedDataQuery = `
	query($owner:String!, $name:String!, $id:String!) {
		repository(owner: $owner, name: $name) {
			defaultBranchRef {
				target {
					... on Commit {
						history(first: 100, author: { id: $id }) {
							edges {
								node {
								committedDate
								}
							}
						}
					}
				}
			}
		}
	}
`

const getGithubStatsQuery = `
query ($username: String!, $id: ID, $from: DateTime!, $to: DateTime!) {
	user(login: $username) {
	  contributionsCollection(from: $from, to: $to) {
		totalCommitContributions
		totalIssueContributions
		totalPullRequestContributions
		totalPullRequestReviewContributions
	  }
	  repositories(orderBy: {field: CREATED_AT, direction: ASC}, last: 100, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER], isFork: false) {
		totalDiskUsage
		totalCount
		edges {
		  node {
			object(expression: "master") {
			  ... on Commit {
				history(author: {id: $id}) {
				  totalCount
				}
			  }
			}
			primaryLanguage {
			  color
			  name
			  id
			}
			stargazers {
			  totalCount
			}
			collaborators {
			  totalCount
			}
			createdAt
			name
			owner {
			  id
			  login
			}
			nameWithOwner
			isPrivate
		  }
		}
	  }
	  location
	  createdAt
	  name
	  isHireable
	}
  }
  `

async function getGithubStats(timeZone) {
	let userinfo = await grapthQLQuery(getUserInfomationQuery)
	userinfo = userinfo.data.viewer
	console.log(userinfo)
	return ""
	let data = getContributedRepos(userinfo, timeZone)
	return data
}

async function getContributedRepos(userinfo, timeZone) {
	let timeData = {
		time: {
			morning: 0,
			daytime: 0,
			evening: 0,
			night: 0,
		},
		days: {
			monday: 0,
			tuesday: 0,
			wednesday: 0,
			thursday: 0,
			friday: 0,
			saturday: 0,
			sunday: 0,
		}
	}

	let repoContributed = await grapthQLQuery(getContributedReposQuery, {username: userinfo.login})
	for(const repo in repoContributed.data.user.repositoriesContributedTo.nodes) {
		let currentRepo = repoContributed.data.user.repositoriesContributedTo.nodes[repo]
		await grapthQLQuery(getCommitedDataQuery, {owner: currentRepo.owner.login, name: currentRepo.name, id: userinfo.id}).then((data) => {
			let committedDates = data.data.repository.defaultBranchRef?.target?.history?.edges
			for (const date in committedDates) {
				let currentDate = committedDates[date].node.committedDate
				let time = DateTime.fromISO(currentDate, {zone: timeZone})
				let hour = time.toFormat('H')
				let day = parseInt(time.toFormat('c'))
				switch(true) {
					case (6 <= hour && hour < 12):
						timeData.time.morning += 1
						break;
					case (12 <= hour && hour < 18):
						timeData.time.daytime += 1
						break
					case (18 <=  hour && hour < 24):
						timeData.time.evening += 1
						break
					case (0 <= hour && hour < 6):
						timeData.time.night += 1
						break
				}
				switch(day) {
					case 1:
						timeData.days.monday += 1
						break;
					case 2:
						timeData.days.tuesday += 1
						break;
					case 3:
						timeData.days.wednesday += 1
						break;
					case 4:
						timeData.days.thursday += 1
						break;
					case 5:
						timeData.days.friday += 1
						break;
					case 6:
						timeData.days.saturday += 1
						break;
					case 7:
						timeData.days.sunday += 1
						break;
				}
			}
		})
	}
	return timeData
}

async function grapthQLQuery(query, variables) {
	let result
	let res = await fetch('https://api.github.com/graphql', {
		method: 'POST',
		body: JSON.stringify({query, variables}),
		headers: {
			'Authorization': `Bearer ${githubToken}`,
		},
	})
	if(res.status == 200) return res.json();
	else throw `Query failed ${res.status_code}, ${query}`;

	return result
}

start()


