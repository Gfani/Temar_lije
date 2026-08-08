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
    </>
  )
}

export default App
