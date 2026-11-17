
CREATE TABLE "Admin_repository" (
	"Tenant_id" TEXT NOT NULL, 
	PRIMARY KEY ("Tenant_id"), 
	CHECK (length("Tenant_id") >= 1)
)

;


CREATE TABLE "Audit_Repository" (
	"Audit_ID" TEXT NOT NULL, 
	"Date" TEXT, 
	"Time" TEXT, 
	"Event" TEXT, 
	"Event_Type" TEXT, 
	PRIMARY KEY ("Audit_ID"), 
	CHECK (length("Audit_ID") >= 1)
)

;


CREATE TABLE "Candidate_Repository" (
	"Candidate_ID" TEXT NOT NULL, 
	"Candidate_Email_Address" TEXT, 
	"Position_ID" TEXT, 
	"Role_ID" TEXT, 
	"Resume_Posting_Date" TEXT, 
	"Resume_Update_Date" TEXT, 
	"Interview_Notification_Date" TEXT, 
	"Total_Number_Of_Notifications" FLOAT, 
	"Interview_Date" TEXT, 
	"Personality_Analysis" TEXT, 
	"A_B" TEXT, 
	"OCEAN" TEXT, 
	"Enneagram" TEXT, 
	"Skill_Analysis_0" TEXT, 
	"Capability_Analysis_0" TEXT, 
	"Conjugate_Skill_Analysis" TEXT, 
	"Conversational_Critical_Thinking" FLOAT, 
	"Conversational_Grasping_Ability" FLOAT, 
	"Conversation_Engagement_Capability" FLOAT, 
	"Role_Play_Analysis" FLOAT, 
	"Mathematic_Reasoning" FLOAT, 
	"Spatial_Reasoning" FLOAT, 
	"Language_Reasoning" FLOAT, 
	"Outlier_Management_Oriented" FLOAT, 
	"Outlier_Skill_Oriented" FLOAT, 
	"Challenge_Response_Conversational" FLOAT, 
	"Challenge_Response_Skill_Oriented" FLOAT, 
	"Forced_Circumstances_Reaction_Skill" FLOAT, 
	"Forced_Circumstances_Reaction_Management" FLOAT, 
	"Organizational_Awareness" FLOAT, 
	"Role_Awareness" FLOAT, 
	"Team_Role_Play" FLOAT, 
	"Interview_Status" TEXT, 
	"Interview_time_taken" FLOAT, 
	"Interview_Transcripts" TEXT, 
	"Information_Date" TEXT, 
	"Offered_Date" TEXT, 
	"Offered_Status" TEXT, 
	"Offered_Rejection_Reason" TEXT, 
	"Standby_Affirmation_Status" TEXT, 
	PRIMARY KEY ("Candidate_ID"), 
	CHECK (length("Candidate_ID") >= 1)
)

;


CREATE TABLE "Position_Repository" (
	"Position_ID" TEXT NOT NULL, 
	"Role_ID" TEXT, 
	"Position_Description" TEXT, 
	"Department" TEXT, 
	"Hiring_Manager" TEXT, 
	"Stake_Holder_Email_0" TEXT, 
	"Stake_Holder_Description_0" TEXT, 
	"Salary_Range" TEXT, 
	"Location" TEXT, 
	"Work_Type" TEXT, 
	"Hiring_Type" TEXT, 
	"Posting_Date" TEXT, 
	"Resume_Analysis_Style" TEXT, 
	"Resume_Count" FLOAT, 
	"Resume_Review_Date" TEXT, 
	"No_Of_Interviews_Selected" FLOAT, 
	"Number_Interviewed" FLOAT, 
	"Total_Shortlisted" FLOAT, 
	"Total_In_Person_Interview" FLOAT, 
	"Person_Interview_candidate_id_0" TEXT, 
	"Position_Closure_Date" TEXT, 
	"Position_On_Hold_Flag" BOOLEAN, 
	"On_Hold_Date" TEXT, 
	"On_UnHold_Date" TEXT, 
	"Position_Expiry_Date" TEXT, 
	"Position_Status" TEXT, 
	"Hired_Salary" TEXT, 
	PRIMARY KEY ("Position_ID"), 
	CHECK (length("Position_ID") >= 1)
)

;


CREATE TABLE "Resume_Repository" (
	"Resume_ID" TEXT NOT NULL, 
	"Email_Address" TEXT, 
	"Resume_URL" TEXT, 
	"Date_Received" TEXT, 
	"Resume_Document" TEXT, 
	"Date_Update_Received" TEXT, 
	"Resume_Update_Document" TEXT, 
	"Primary_Skill_Object" TEXT, 
	"Primary_Role" TEXT, 
	"Candidate_ID" TEXT, 
	PRIMARY KEY ("Resume_ID"), 
	CHECK (length("Resume_ID") >= 1)
)

;


CREATE TABLE "Role_Repository" (
	"Role_ID" TEXT NOT NULL, 
	"Role_Name" TEXT, 
	"Role_Level" TEXT, 
	"Role_Function" TEXT, 
	"Role_Description" TEXT, 
	"Role_Posting_Date" TEXT, 
	"Skill" TEXT, 
	"Personality_Merge" TEXT, 
	"Outlier_Skill" TEXT, 
	"Conjugate_Skill" TEXT, 
	"Management_Skill" TEXT, 
	"Salary_Range" TEXT, 
	"Last_Posted_Date" TEXT, 
	"Repeat_Posting" TEXT, 
	"Posted_Channel" TEXT, 
	"Number_Of_Resume_Received_And_Channel" TEXT, 
	"Personality_Analysis" BOOLEAN, 
	"A_B" BOOLEAN, 
	"OCEAN" BOOLEAN, 
	"Enneagram" BOOLEAN, 
	"Skill_Analysis" BOOLEAN, 
	"Capability_Analysis" BOOLEAN, 
	"Conjugate_Skill_Analysis" BOOLEAN, 
	"Conversational_Critical_Thinking" BOOLEAN, 
	"Conversational_Grasping_Ability" BOOLEAN, 
	"Conversation_Engagement_Capability" BOOLEAN, 
	"Role_Play_Analysis" BOOLEAN, 
	"Mathematic_Reasoning" BOOLEAN, 
	"Spatial_Reasoning" BOOLEAN, 
	"Language_Reasoning" BOOLEAN, 
	"Outlier_Management_Oriented" BOOLEAN, 
	"Outlier_Skill_Oriented" BOOLEAN, 
	"Challenge_Response_Conversational" BOOLEAN, 
	"Challenge_Response_Skill_Oriented" BOOLEAN, 
	"Forced_Circumstances_Reaction_Skill" BOOLEAN, 
	"Forced_Circumstances_Reaction_Management" BOOLEAN, 
	"Organizational_Awareness" BOOLEAN, 
	"Role_Awareness" BOOLEAN, 
	"Team_Role_Play" BOOLEAN, 
	"Organization_Introduction" TEXT, 
	PRIMARY KEY ("Role_ID"), 
	CHECK (length("Role_ID") >= 1)
)

;


CREATE TABLE "user_repository" (
	"user_email_id" TEXT NOT NULL, 
	"Date" TEXT, 
	"User_query" TEXT, 
	"Graph_query" TEXT, 
	PRIMARY KEY ("user_email_id"), 
	CHECK (length("user_email_id") >= 1)
)

;
