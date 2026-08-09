import CreateAccount from "./features/auth/create_account/create_account"
import SignIn from "./features/auth/signin/signin"
import AssignmentsTab from "./features/classroom-detail/tabs/AssignmentsTab/AssignmentsTab"
import LiveClassTab from "./features/classroom-detail/tabs/LiveClassTab/LiveClassTab"
import TeacherMemberTab from "./features/classroom-detail/tabs/TeacherMemberTab/TeacherMemberTab"
import StudyBuddy from "./features/study-buddy/study-buddy"
import Chat from "./features/chat/chat"
import Header from './components/common/Header/header';
import Footer from './components/common/Footer/footer';
import MembersTab from './features/classroom-detail/MembersTab';





function App() {
  return (
    <>
      <Header />
      <Chat />
      <LiveClassTab />
      <AssignmentsTab />
      <TeacherMemberTab />
      <MembersTab/>
      <StudyBuddy />
      <SignIn />
      <CreateAccount />
      <Footer />
    </>
  )
}

export default App