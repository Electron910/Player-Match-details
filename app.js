const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();

const dbPath = path.join(__dirname, "cricketMatchDetails.db");

app.use(express.json());

let db = null;

const dbAndServerInitializer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server running at https://localhost:3000/")
    );
  } catch (e) {
    console.log(`DB err: ${e.message}`);
    process.exit(1);
  }
};

dbAndServerInitializer();

const convertMatchDetailsJsonToObj = (item) => {
  return {
    matchId: item.match_id,
    match: item.match,
    year: item.year,
  };
};

const convertStatsJsonToObj = (dbObj) => {
  return {
    playerId: dbObj.playerId,
    playerName: dbObj.playerName,
    totalScore: dbObj.totalScore,
    totalFours: dbObj.totalFours,
    totalSixes: dbObj.totalSixes,
  };
};

const jsonToObject = (dbObj) => {
  return {
    playerId: dbObj.player_id,
    playerName: dbObj.player_name,
  };
};

app.get("/players/", async (request, response) => {
  const getAllPLayers = `
    SELECT
    *
    FROM
    player_details;
    `;
  const gotAllPlayers = await db.all(getAllPLayers);
  response.send(gotAllPlayers.map((item) => jsonToObject(item)));
});

//Get player based on ID
app.get("/players/:playerId", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerOnId = `
    SELECT 
    *
    FROM 
    player_details
    WHERE 
    player_id = '${playerId}';
    `;
  const playerOnId = await db.get(getPlayerOnId);
  response.send(playerOnId);
});

//Update details of player
app.put("/players/:playerId/", async (request, response) => {
  const { playerId, playerName } = request.body;
  const updatePlayerOnId = `
    UPDATE player_details
    SET
    player_name = '${playerName}'
    WHERE
    player_id = '${playerId}';
    `;
  const updatedPlayer = await db.run(updatePlayerOnId);
  response.send("Player Details Updated");
});

//Details of specific match
app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getDetailsOfMatchOnId = `
    SELECT
    *
    FROM
    match_details
    WHERE 
    match_id = '${matchId}';
    `;
  const detailsOfMatch = await db.get(getDetailsOfMatchOnId);
  response.send(detailsOfMatch);
});

//List of matches of a player
app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getListOfPlayerMatches = `
    SELECT 
    *
    FROM 
    player_match_score NATURAL JOIN match_details
    WHERE 
    player_id = '${playerId}';
    `;
  const gotDetailsOfMatches = await db.all(getListOfPlayerMatches);
  response.send(
    gotDetailsOfMatches.map((eachMatch) =>
      convertMatchDetailsJsonToObj(eachMatch)
    )
  );
});

//List of players in a specific match
app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getListOfPLayersInMatch = `
    SELECT
    *
    FROM 
    player_details NATURAL JOIN player_match_score
    WHERE 
    match_id = '${matchId}';
    `;
  const listOfPlayers = await db.all(getListOfPLayersInMatch);
  response.send(
    listOfPlayers.map((item) => ({
      playerId: item.player_id,
      playerName: item.player_name,
    }))
  );
});

//Statistics of a player
app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getStatisticsOfPlayer = `
   SELECT
    player_details.player_id AS playerId,
    player_details.player_name AS playerName,
    SUM(player_match_score.score) AS totalScore,
    SUM(fours) AS totalFours,
    SUM(sixes) AS totalSixes 
    FROM 
    player_details INNER JOIN player_match_score ON
    player_details.player_id = player_match_score.player_id
    WHERE player_details.player_id = ${playerId};
    `;
  const statsOfPlayer = await db.get(getStatisticsOfPlayer);
  response.send(convertStatsJsonToObj(statsOfPlayer));
});

module.exports = app;
