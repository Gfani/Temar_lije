
=======
import React from 'react';
import Landingpage from './features/landing/landing.jsx';
import CreateAccount from "./features/auth/create_account/create_account";
import SignIn from "./features/auth/signin/signin";
import AssignmentsTab from "./features/classroom-detail/tabs/AssignmentsTab/AssignmentsTab";
import LiveClassTab from "./features/classroom-detail/tabs/LiveClassTab/LiveClassTab";
import TeacherMemberTab from "./features/classroom-detail/tabs/TeacherMemberTab/TeacherMemberTab";
import StudyBuddy from "./features/study-buddy/study-buddy";
import Chat from "./features/chat/chat";'
import Title from "./components/common/title/Title"

export default function App() {
  return (

    <div>
     <Title/>
      <Landingpage />
      <Chat />
      <LiveClassTab />
      <AssignmentsTab />
      <TeacherMemberTab />
      <MembersTab />
      <StudyBuddy />
      <SignIn />
      <CreateAccount />
    </div>
  );
}
