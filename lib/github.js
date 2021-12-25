import { DateTime } from "luxon";
import fetch from "node-fetch";
import _ from "lodash";
import { Octokit } from "@octokit/rest";
import { Base64 } from "js-base64";

export { getGithubStats, updateReadme };

async function getGithubStats(timezone, gh_token) {
	let githubData = {
		userInfo: undefined,
		personalStats: undefined,
		contributionRepos: undefined,
		totalContributions: undefined,
	};
	let userInfo = await graphQLQuery(gh_token, getuserInfomationQuery);
	githubData.userInfo = await userInfo.data.viewer;
	githubData.personalStats = await getGithubPersonalStats(gh_token, githubData.userInfo);
	githubData.contributionRepos = await getContributedRepos(gh_token, githubData.userInfo, timezone);
	githubData.totalContributions = calculations(githubData.personalStats.contribution);
	return githubData;
}

function calculations(contribution) {
	let total =
		contribution.totalCommitContributions +
		contribution.totalIssueContributions +
		contribution.totalPullRequestContributions +
		contribution.totalPullRequestReviewContributions +
		contribution.totalRepositoriesWithContributedCommits +
		contribution.totalRepositoriesWithContributedIssues +
		contribution.totalRepositoriesWithContributedPullRequestReviews +
		contribution.totalRepositoriesWithContributedPullRequests;
	return total;
}

async function getGithubPersonalStats(gh_token, userInfo) {
	let gitHubData = {
		isHireable: undefined,
		contribution: undefined,
		totalDiskUsage: undefined,
		totalCount: undefined,
		repos: undefined,
		repoStats: undefined,
	};

	let data = await graphQLQuery(gh_token, getGithubStatsQuery, { username: userInfo.login, id: userInfo.id, from: DateTime.now().startOf("year").toISO(), to: DateTime.now().endOf("year").toISO() });
	gitHubData.isHireable = data.data.user.isHireable;
	gitHubData.contribution = data.data.user.contributionsCollection;
	gitHubData.repos = data.data.user.repositories.edges;
	gitHubData.totalDiskUsage = data.data.user.repositories.totalDiskUsage;
	gitHubData.totalCount = data.data.user.repositories.totalCount;
	gitHubData.repoStats = await getPrivateRepoCount(gitHubData.repos);
	return gitHubData;
}

async function getPrivateRepoCount(repos) {
	let repoStats = {
		privateCount: 0,
		publicCount: 0,
		languages: {},
	};

	repos.forEach((repo) => {
		let l = repo.node.primaryLanguage?.name;
		repoStats.languages[`${l}`] = (repoStats.languages[`${l}`] || 0) + 1;
		repo.node.isPrivate ? (repoStats.privateCount += 1) : (repoStats.publicCount += 1);
	});

	repoStats.languages = _(repoStats.languages).toPairs().orderBy([1], ["desc"]).value();

	repoStats.languages.map((language) => {
		return language.push((language[1] / (repoStats.privateCount + repoStats.publicCount)) * 100);
	});
	return repoStats;
}

async function getContributedRepos(gh_token, userInfo, timezone) {
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
		},
		biggestDay: undefined,
		biggestTime: undefined,
		totalContributions: 0,
	};
	let repoContributed = await graphQLQuery(gh_token, getContributedReposQuery, { username: userInfo.login });
	for (const repo in repoContributed.data.user.repositoriesContributedTo.nodes) {
		let currentRepo = repoContributed.data.user.repositoriesContributedTo.nodes[repo];
		await graphQLQuery(gh_token, getCommittedDataQuery, { owner: currentRepo.owner.login, name: currentRepo.name, id: userInfo.id }).then((data) => {
			let committedDates = data.data.repository.defaultBranchRef?.target?.history?.edges;
			for (const date in committedDates) {
				let currentDate = committedDates[date].node.committedDate;
				let time = DateTime.fromISO(currentDate, { zone: timezone });
				let hour = time.toFormat("H");
				let day = parseInt(time.toFormat("c"));
				timeData.totalContributions += 1;
				switch (true) {
					case 6 <= hour && hour < 12:
						timeData.time.morning += 1;
						break;
					case 12 <= hour && hour < 18:
						timeData.time.daytime += 1;
						break;
					case 18 <= hour && hour < 24:
						timeData.time.evening += 1;
						break;
					case 0 <= hour && hour < 6:
						timeData.time.night += 1;
						break;
				}
				switch (day) {
					case 1:
						timeData.days.monday += 1;
						break;
					case 2:
						timeData.days.tuesday += 1;
						break;
					case 3:
						timeData.days.wednesday += 1;
						break;
					case 4:
						timeData.days.thursday += 1;
						break;
					case 5:
						timeData.days.friday += 1;
						break;
					case 6:
						timeData.days.saturday += 1;
						break;
					case 7:
						timeData.days.sunday += 1;
						break;
				}
			}
		});
	}

	let temp1 = maxValueObject(timeData.time, timeData.totalContributions);
	timeData.biggestTime = temp1.max;
	timeData.time = temp1.tempObj;
	let temp2 = maxValueObject(timeData.days, timeData.totalContributions);
	timeData.biggestDay = temp2.max;
	timeData.days = temp2.tempObj;
	return timeData;
}

function maxValueObject(obj, total) {
	let tempObj = _(obj).toPairs().value();
	let max = _.maxBy(tempObj, function (o) {
		return o[1];
	});
	tempObj.map((pair) => {
		return pair.push((pair[1] / total) * 100);
	});
	let newValue = {
		tempObj,
		max,
	};
	return newValue;
}

async function graphQLQuery(gh_token, query, variables) {
	try {
		if (gh_token == undefined) throw "No GH Token provided";
		let res = await fetch("https://api.github.com/graphql", {
			method: "POST",
			body: JSON.stringify({ query, variables }),
			headers: {
				Authorization: `Bearer ${gh_token}`,
			},
		});
		// console.log(res);
		if (res.status == 200) return res.json();
		else throw `Query failed ${res.status_code}, ${query}`;
	} catch (e) {
		console.log(e);
	}
}

const getuserInfomationQuery = `
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
`;

const getCommittedDataQuery = `
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
`;

const getGithubStatsQuery = `
query ($username: String!, $id: ID, $from: DateTime!, $to: DateTime!) {
	user(login: $username) {
	  contributionsCollection(from: $from, to: $to) {
		contributionYears
		totalCommitContributions
		totalIssueContributions
		totalPullRequestContributions
		totalPullRequestReviewContributions
		totalRepositoriesWithContributedCommits
		totalRepositoriesWithContributedIssues
		totalRepositoriesWithContributedPullRequestReviews
		totalRepositoriesWithContributedPullRequests
		totalRepositoryContributions
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
  `;

async function updateReadme(gh_token, gitUser, entryPoints, devStat) {
	const octokit = new Octokit({ auth: gh_token });
	let readmeFile = await getContent(octokit, gitUser);
	let readmeDecoded = Base64.decode(readmeFile.data.content);
	let reg = new RegExp("(?<=" + entryPoints.start + ")([\\S\\s]*?)(?=" + entryPoints.end + ")", "g");
	let devReplaced = readmeDecoded.replace(reg, `\n${devStat}\n`);
	createOrUpdateFileContents(octokit, readmeFile.data.sha, devReplaced, gitUser);
}

async function getContent(octokit, gitUser) {
	try {
		const getContent = await octokit.repos.getContent({
			owner: gitUser.login,
			repo: gitUser.login,
			path: `README.md`,
		});
		return getContent;
	} catch (err) {
		console.error(err);
	}
}

async function createOrUpdateFileContents(octokit, sha, data, gitUser) {
	try {
		const contentEncoded = Base64.encode(data);
		const result = await octokit.repos.createOrUpdateFileContents({
			owner: gitUser.login,
			repo: gitUser.login,
			message: `Updated Dev Metrics`,
			content: contentEncoded,
			path: `README.md`,
			sha,
		});
		return result;
	} catch (err) {
		console.error(err);
	}
}
