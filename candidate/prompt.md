Lets create the plan to implement Resume Analysis. Here is the flow:
This is a module in the Aiccuhire platform. Make sure to create the md file for the prompts based on the details below.
It must be production ready codebase that could be easily integrated within the platform.
This module gets triggered as soon as the candidate has applied for the job posting of a company. On application the candidate is asked to provide information and upload the resume. 
Resume Format :
- Resume could have any format like pdf, word, even speech where candidate dictates all the details about his experience
- Resume could be 2 pages or 20 pages long
- Resume could include any details about the candidate - their skills, job experience, college projects, personal skills, team skills, personality, capability with examples etc
Once the resume is submitted. Extract the details about the job position from position database that will contain json object below:
Role ID 
Department  
Hiring Manager  
Role Level  
Role Function  
Role Description  
Role Posting date 
Skill (separated by comma)  
Personality Merge (separated by comma) 
Outlier Skill 
Conjugate Skill
Management Skill
 Salary Range      
Now, extract the details from Candidate resume based on the applied position specifically using LLM. 

*****************
Response :
The module response will the the score for candidate on the applied position based on the match from the Job position database. The score could be based specific matching algorithm that is available and best suited for this purpose. All the different skills could be directly or indirectly presented in the resume that need to extracted correctly first. Then apply the matching and score. These scores will be input to the resume database with jobId, candidate email, resume id and scores


Additional Clarification :
How should the platform use the match scores?
Ranking and shortlisting

Are "Personality Merge,"Outlier Skill," and "Conjugate Skill" already defined in Aiccuhire?
Keep configurable

The integration choice wasn't captured. Which backend should this plan target?
Python service (Recommended)

What should the first production release accept
?Documents plus transcript

May the job-position contract be extended with explicit requirements, priorities, and category definitions?
Yes, extend it (Recommended)

What constraint should the plan use for LLM processing of candidate data?
Configurable hosted API (Recommended)

Which resume languages must the first release support?
English first (Recommended)

How should shortlist recommendations be selected?
Top N per job (Recommended)