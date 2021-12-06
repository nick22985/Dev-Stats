import { DateTime } from "luxon";
import fetch from 'node-fetch';
import * as timeSort from 'timsort';

export { getGithubStats, getContributedRepos, grapthQLQuery};

async function getGithubStats(timeZone, gh_token) {
	let userinfo = await grapthQLQuery(gh_token, getUserInfomationQuery)
	userinfo = userinfo.data.viewer
	let personalstats = await getGithubPersonalStats(gh_token, userinfo)
	let data = await getContributedRepos(gh_token, userinfo, timeZone)
	return data
}

async function getGithubPersonalStats(gh_token, userinfo) {
	let gitHubData = {
		isHireable: undefined,
		contribution: undefined,
		totalDiskUsage: undefined,
		totalCount: undefined,
		repos: undefined,
		repoStats: undefined,
	}
	let data = await grapthQLQuery(gh_token, getGithubStatsQuery, {username: userinfo.login, id: userinfo.id, from: DateTime.now().startOf('year').toISO(), to: DateTime.now().endOf('day').toISO()})
	gitHubData.isHireable = data.data.user.isHireable
	gitHubData.contribution = data.data.user.contributionsCollection
	gitHubData.repos = data.data.user.repositories.edges
	gitHubData.totalDiskUsage = data.data.user.repositories.totalDiskUsage
	gitHubData.totalCount = data.data.user.repositories.totalCount
	gitHubData.repoStats = await getPrivateRepoCount(gitHubData.repos)
}


function numberCompare(a, b) {
	console.log(a)
	console.log(b)
	return a-b;
}

async function getPrivateRepoCount(repos) {
	let repoStats = {
		privateCount: 0,
		publicCount: 0,
		languages: [{}]
	}

	repos.forEach(repo => {
		let l = repo.node.primaryLanguage?.name
		repoStats.languages[0][`${l}`] = (repoStats.languages[0][`${l}`] || 0) + 1;
		repo.node.isPrivate ? repoStats.privateCount += 1 : repoStats.publicCount +=1
	});
	console.log(repoStats)

	return repoStats
}

async function getContributedRepos(gh_token, userinfo, timeZone) {
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
	let repoContributed = await grapthQLQuery(gh_token, getContributedReposQuery, {username: userinfo.login})
	for(const repo in repoContributed.data.user.repositoriesContributedTo.nodes) {
		let currentRepo = repoContributed.data.user.repositoriesContributedTo.nodes[repo]
		await grapthQLQuery(gh_token, getCommitedDataQuery, {owner: currentRepo.owner.login, name: currentRepo.name, id: userinfo.id}).then((data) => {
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

async function grapthQLQuery(gh_token, query, variables) {
	try{
		if(gh_token == undefined) throw "No GH Token provided"
		let res = await fetch('https://api.github.com/graphql', {
			method: 'POST',
			body: JSON.stringify({query, variables}),
			headers: {
				'Authorization': `Bearer ${gh_token}`,
			},
		})
		if(res.status == 200) return res.json();
		else throw `Query failed ${res.status_code}, ${query}`;
	} catch(e) {
		console.log(e)
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
