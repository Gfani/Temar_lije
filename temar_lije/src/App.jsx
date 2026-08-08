import CreateAccount from "./features/auth/create_account/create_account"
import SignIn from "./features/auth/signin/signin"
import AssignmentsTab from "./features/classroom-detail/tabs/AssignmentsTab/AssignmentsTab"
import LiveClassTab from "./features/classroom-detail/tabs/LiveClassTab/LiveClassTab"
import TeacherMemberTab from "./features/classroom-detail/tabs/TeacherMemberTab/TeacherMemberTab"
import StudyBuddy from "./features/study-buddy/study-buddy"
function App() {


  return (
    <>
      <LiveClassTab />
      <AssignmentsTab />
      <TeacherMemberTab />
      <StudyBuddy />
      <SignIn />
      <CreateAccount />
    </>
  )
}

export default App
