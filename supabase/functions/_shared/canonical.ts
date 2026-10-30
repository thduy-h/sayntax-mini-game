export const ACCESSIBILITY_IDS = ["contrast","keyboard","captions","language","touch","color","time","motion","alt","plain","audio","navigation"] as const;
export type RobotLevel = { start:{x:number;y:number};goal:{x:number;y:number};walls:string[];par:number;initialDirection:number };
export const ROBOT_LEVELS: Record<string, RobotLevel> = {
 "1":{start:{x:0,y:4},goal:{x:4,y:4},walls:["2,3"],par:4,initialDirection:1},
 "2":{start:{x:0,y:4},goal:{x:4,y:1},walls:["2,4","2,3","2,2"],par:9,initialDirection:1},
 "3":{start:{x:1,y:5},goal:{x:5,y:0},walls:["2,5","2,4","2,3","4,2","3,2","2,2"],par:11,initialDirection:1},
 "4":{start:{x:0,y:0},goal:{x:5,y:2},walls:["2,0","2,1","4,2"],par:12,initialDirection:1},
 "5":{start:{x:5,y:5},goal:{x:1,y:0},walls:["3,5","3,4","3,2","2,2"],par:11,initialDirection:3},
 "6":{start:{x:1,y:1},goal:{x:4,y:5},walls:["1,2","2,2","3,2","3,4"],par:9,initialDirection:2},
 "7":{start:{x:0,y:5},goal:{x:5,y:0},walls:["1,5","1,4","1,3","3,3","4,3","4,1"],par:12,initialDirection:1},
 "8":{start:{x:5,y:0},goal:{x:0,y:5},walls:["4,0","4,1","2,1","2,2","2,3","3,3"],par:11,initialDirection:2},
 "9":{start:{x:0,y:0},goal:{x:5,y:5},walls:["1,0","1,1","1,2","3,2","4,2","4,4"],par:12,initialDirection:1}
};
export function freezeConfig(game:string,input:unknown){ if(!input||typeof input!=="object")throw new Error("invalid_config"); const value=input as Record<string,unknown>; if(game==="accessibility"){const ids=Array.isArray(value.scenarioIds)?value.scenarioIds:[];if(ids.length<1||ids.length>12||new Set(ids).size!==ids.length||ids.some((id)=>typeof id!=="string"||!ACCESSIBILITY_IDS.includes(id as typeof ACCESSIBILITY_IDS[number])))throw new Error("invalid_scenario_ids");return{scenarioIds:ids,questionCount:ids.length};} const ids=Array.isArray(value.levelIds)?value.levelIds.map(String):[];if(ids.length<1||ids.length>9||new Set(ids).size!==ids.length||ids.some((id)=>!ROBOT_LEVELS[id]))throw new Error("invalid_level_ids");return{levelIds:ids,levels:Object.fromEntries(ids.map((id)=>[id,ROBOT_LEVELS[id]]))}; }
export const ACCESSIBILITY_POINTS: Record<string, Record<string, number>> = {
 contrast:{contrast:100,icon:20,hide:0},keyboard:{focus:100,tab:0,mouse:15},captions:{captions:100,volume:10,transcript:45},language:{specific:100,red:25,reload:0},
 touch:{best:100,partial:35,harmful:0},color:{best:100,partial:35,harmful:0},time:{best:100,partial:35,harmful:0},motion:{best:100,partial:35,harmful:0},alt:{best:100,partial:35,harmful:0},plain:{best:100,partial:35,harmful:0},audio:{best:100,partial:35,harmful:0},navigation:{best:100,partial:35,harmful:0}
};
export type RobotCommand = "forward"|"left"|"right";
export function runRobotCommands(level:RobotLevel,commands:RobotCommand[]){let x=level.start.x,y=level.start.y,d=level.initialDirection;for(const command of commands.slice(0,24)){if(command==="left")d=(d+3)%4;else if(command==="right")d=(d+1)%4;else{const nx=x+[0,1,0,-1][d],ny=y+[-1,0,1,0][d];if(nx<0||nx>5||ny<0||ny>5||level.walls.includes(`${nx},${ny}`))return false;x=nx;y=ny;}}return x===level.goal.x&&y===level.goal.y;}
export function scoreRobotCommands(level:RobotLevel,commands:RobotCommand[]){return runRobotCommands(level,commands)?Math.max(100,320-18*Math.max(0,commands.length-level.par)):0;}
