import { expect, test } from "@playwright/test";
import { competitionConfig } from "../../supabase/functions/_shared/competition-content";
const id="90000000-0000-0000-0000-000000000009";
test("MC color simulation follows across independent team/projector contexts and reload; next question resets",async({browser},info)=>{
  let enabled=false,index=0;
  const bank=competitionConfig(1).questions!;
  const questions=[bank.find(q=>q.id==='color')!,bank.find(q=>q.id==='keyboard')!];
  const contexts=await Promise.all([0,1,2].map(()=>browser.newContext({viewport:info.project.use.viewport})));
  const writes:string[]=[];
  try{
    for(const [n,c] of contexts.entries()){
      const role=['mc','team','presentation'][n];
      await c.addInitScript(({id,role})=>{if(role!=='presentation')sessionStorage.setItem(`arena-competition-v2:${id}:${role}:${role==='team'?1:'mc'}`,JSON.stringify({competitionId:id,role,token:`synthetic-${role}`,stage:role==='team'?1:undefined,teamId:'team-a'}));},{id,role});
      await c.route('**/functions/v1/**',async route=>{
        const body=route.request().postDataJSON(),endpoint=route.request().url().split('/').pop();
        if(endpoint==='arena-join-room')return route.fulfill({json:{mode:'competition',competitionId:id,stage:1,status:'STAGE_1_ACTIVE'}});
        if(endpoint!=='arena-get-state'){
          expect(role).toBe('mc');writes.push(body.action);
          if(body.action==='set_a11y_vision'){expect(body.viewScope).toBe(`stage:1:${index}:round`);enabled=body.enabled;}
          else if(body.action==='advance_challenge'){index++;enabled=false;}
          else throw Error('unexpected action');
          return route.fulfill({json:{ok:true}});
        }
        return route.fulfill({json:{mode:'competition',role,rulesVersion:'v5',serverNow:new Date().toISOString(),a11yColorblindSim:enabled,a11yViewMode:'before',a11yViewScope:`stage:1:${index}:round`,teamsCount:1,joinCode:'ABC234',competition:{id,name:'Color sync',status:'STAGE_1_ACTIVE',expiresAt:'2099-01-01',winnerTeamId:null},stages:[{stageNo:1,status:'active',roundId:'round',activeIndex:index,totalItems:2,deadlineAt:'2099-01-01',itemDeadline:'2099-01-01',progress:{total:1,submitted:1},challenge:questions[index],...(role==='mc'?{config:{questions,scenarioIds:questions.map(q=>q.id)}}:{})}],teams:role==='mc'?[{id:'ct-a',name:'Synthetic'}]:undefined,own:role==='team'?{teamId:'team-a',competitionTeamId:'ct-a',name:'Synthetic',submissions:[]}:undefined}});
      });
    }
    const [mc,team,present]=await Promise.all(contexts.map(c=>c.newPage()));
    await Promise.all([mc.goto(`/competition/${id}`),team.goto('/join/ABC234'),present.goto(`/present/${id}#token=synthetic-presentation`)]);
    const button=(p:typeof mc)=>p.getByRole('button',{name:/mô phỏng Mù màu|Đang xem: Đen trắng/});
    for(const p of [team,present])await expect(button(p)).toBeDisabled();
    await button(mc).click();
    for(const p of [mc,team,present]){await expect(button(p)).toHaveAttribute('aria-pressed','true',{timeout:12000});await expect(p.locator('.a11y-mockup-canvas')).toHaveClass(/is-grayscale/);}
    await team.reload();await present.reload();
    for(const p of [team,present])await expect(button(p)).toHaveAttribute('aria-pressed','true');
    await button(mc).click();
    for(const p of [team,present]){await expect(button(p)).toHaveAttribute('aria-pressed','false',{timeout:12000});await expect(p.locator('.a11y-mockup-canvas')).not.toHaveClass(/is-grayscale/);}
    await button(mc).click();await expect(button(team)).toHaveAttribute('aria-pressed','true',{timeout:12000});
    await mc.getByRole('button',{name:'Thử thách tiếp theo',exact:true}).click();
    for(const p of [team,present]){await expect(p.getByRole('heading',{name:questions[1].title,exact:true})).toBeVisible({timeout:12000});await expect(p.locator('.a11y-mockup-canvas')).not.toHaveClass(/is-grayscale/);}
    expect(writes.filter(w=>w==='set_a11y_vision')).toHaveLength(3);
  }finally{await Promise.all(contexts.map(c=>c.close()));}
});
