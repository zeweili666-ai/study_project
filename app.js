const STORAGE_KEY = "semester-study-planner-v1";
const EMPTY_STATE = { courses: [], tasks: [], research: [], exams: [], lessons: [], notes: [], progress: {}, rescheduleBoosts: {}, planOffsets: {} };

let state = { ...EMPTY_STATE };
let taskFilters = { status: "all", courseId: "all" };
let calendarEventDetails = new Map();
let calendarFilters = { course: true, task: true, exam: true, study: true, research: true };

const viewTitles = {
  dashboard: "学习总览",
  courses: "课程信息",
  import: "导入信息",
  lessons: "课次内容",
  notes: "课堂笔记",
  tasks: "任务 / DDL",
  research: "科研任务",
  exams: "考试安排",
  plan: "每日学习计划",
  calendar: "学习日历",
  review: "复习模式",
  search: "资料搜索",
};

let calendarCursor = new Date();

const statusLabels = {
  todo: "未开始",
  doing: "进行中",
  done: "已完成",
  skipped: "跳过",
  delayed: "延期",
};

const els = {
  navItems: document.querySelectorAll(".nav-item"),
  viewButtons: document.querySelectorAll("[data-view]"),
  views: document.querySelectorAll(".view"),
  viewTitle: document.querySelector("#viewTitle"),
  todayDate: document.querySelector("#todayDate"),
  focusHint: document.querySelector("#focusHint"),
  courseCount: document.querySelector("#courseCount"),
  openTaskCount: document.querySelector("#openTaskCount"),
  urgentCount: document.querySelector("#urgentCount"),
  examCount: document.querySelector("#examCount"),
  lessonCount: document.querySelector("#lessonCount"),
  noteCount: document.querySelector("#noteCount"),
  researchCount: document.querySelector("#researchCount"),
  todayList: document.querySelector("#todayList"),
  priorityList: document.querySelector("#priorityList"),
  studySummary: document.querySelector("#studySummary"),
  courseForm: document.querySelector("#courseForm"),
  courseFormTitle: document.querySelector("#courseFormTitle"),
  courseSubmitButton: document.querySelector("#courseSubmitButton"),
  cancelCourseEdit: document.querySelector("#cancelCourseEdit"),
  taskForm: document.querySelector("#taskForm"),
  taskFormTitle: document.querySelector("#taskFormTitle"),
  taskSubmitButton: document.querySelector("#taskSubmitButton"),
  cancelTaskEdit: document.querySelector("#cancelTaskEdit"),
  taskStatusFilter: document.querySelector("#taskStatusFilter"),
  taskCourseFilter: document.querySelector("#taskCourseFilter"),
  ddlOverview: document.querySelector("#ddlOverview"),
  dashboardDdlOverview: document.querySelector("#dashboardDdlOverview"),
  researchForm: document.querySelector("#researchForm"),
  examForm: document.querySelector("#examForm"),
  examFormTitle: document.querySelector("#examFormTitle"),
  examSubmitButton: document.querySelector("#examSubmitButton"),
  cancelExamEdit: document.querySelector("#cancelExamEdit"),
  importForm: document.querySelector("#importForm"),
  lessonForm: document.querySelector("#lessonForm"),
  noteForm: document.querySelector("#noteForm"),
  noteFormTitle: document.querySelector("#noteFormTitle"),
  noteSubmitButton: document.querySelector("#noteSubmitButton"),
  cancelNoteEdit: document.querySelector("#cancelNoteEdit"),
  courseList: document.querySelector("#courseList"),
  taskList: document.querySelector("#taskList"),
  researchList: document.querySelector("#researchList"),
  examList: document.querySelector("#examList"),
  lessonList: document.querySelector("#lessonList"),
  noteList: document.querySelector("#noteList"),
  taskCourse: document.querySelector("#taskCourse"),
  examCourse: document.querySelector("#examCourse"),
  importCourse: document.querySelector("#importCourse"),
  lessonCourse: document.querySelector("#lessonCourse"),
  noteCourse: document.querySelector("#noteCourse"),
  importKind: document.querySelector("#importKind"),
  importText: document.querySelector("#importText"),
  importFile: document.querySelector("#importFile"),
  importPreview: document.querySelector("#importPreview"),
  extractFile: document.querySelector("#extractFile"),
  noteFile: document.querySelector("#noteFile"),
  noteContent: document.querySelector("#noteContent"),
  extractNoteFile: document.querySelector("#extractNoteFile"),
  seedDemo: document.querySelector("#seedDemo"),
  clearData: document.querySelector("#clearData"),
  exportData: document.querySelector("#exportData"),
  importDataButton: document.querySelector("#importDataButton"),
  importDataFile: document.querySelector("#importDataFile"),
  regenPlan: document.querySelector("#regenPlan"),
  rescheduleToday: document.querySelector("#rescheduleToday"),
  planDays: document.querySelector("#planDays"),
  planList: document.querySelector("#planList"),
  calendarBrief: document.querySelector("#calendarBrief"),
  calendarFilters: document.querySelector("#calendarFilters"),
  calendarGrid: document.querySelector("#calendarGrid"),
  calendarTitle: document.querySelector("#calendarTitle"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  todayMonth: document.querySelector("#todayMonth"),
  reviewCourse: document.querySelector("#reviewCourse"),
  reviewToday: document.querySelector("#reviewToday"),
  reviewHighlights: document.querySelector("#reviewHighlights"),
  reviewExams: document.querySelector("#reviewExams"),
  reviewLessons: document.querySelector("#reviewLessons"),
  reviewNotes: document.querySelector("#reviewNotes"),
  reviewTasks: document.querySelector("#reviewTasks"),
  searchInput: document.querySelector("#searchInput"),
  searchScope: document.querySelector("#searchScope"),
  runSearch: document.querySelector("#runSearch"),
  searchSummary: document.querySelector("#searchSummary"),
  searchResults: document.querySelector("#searchResults"),
  aiForm: document.querySelector("#aiForm"),
  aiAction: document.querySelector("#aiAction"),
  aiInput: document.querySelector("#aiInput"),
  aiOutput: document.querySelector("#aiOutput"),
  aiModelLabel: document.querySelector("#aiModelLabel"),
  aiImportForm: document.querySelector("#aiImportForm"),
  aiImportInput: document.querySelector("#aiImportInput"),
  aiImportFile: document.querySelector("#aiImportFile"),
  readAiImportFile: document.querySelector("#readAiImportFile"),
  aiImportDraft: document.querySelector("#aiImportDraft"),
  aiImportStatus: document.querySelector("#aiImportStatus"),
};

init();

async function init() {
  state = await loadState();
  els.todayDate.textContent = formatDate(new Date());
  bindEvents();
  render();
}

function bindEvents() {
  els.viewButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  els.courseForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const course = {
      id: makeId(),
      name: data.name.trim(),
      meta: data.meta.trim(),
      schedule: data.schedule.trim(),
      goal: data.goal.trim(),
    };
    if (data.id) {
      state.courses = state.courses.map((item) => (item.id === data.id ? { ...item, ...course, id: data.id } : item));
    } else {
      state.courses.push(course);
    }
    resetCourseForm();
    persistAndRender();
  });
  els.cancelCourseEdit.addEventListener("click", resetCourseForm);

  els.taskForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const task = {
      id: data.id || makeId(),
      title: data.title.trim(),
      courseId: data.courseId,
      dueDate: data.dueDate,
      hours: Number(data.hours || 1),
      weight: Number(data.weight || 2),
      details: data.details.trim(),
      completed: false,
    };
    if (data.id) {
      const existing = state.tasks.find((item) => item.id === data.id);
      state.tasks = state.tasks.map((item) => (item.id === data.id ? { ...item, ...task, completed: existing?.completed || false } : item));
    } else {
      state.tasks.push(task);
    }
    resetTaskForm();
    persistAndRender();
  });
  els.cancelTaskEdit.addEventListener("click", resetTaskForm);
  els.taskStatusFilter.addEventListener("change", () => {
    taskFilters.status = els.taskStatusFilter.value;
    renderTasks();
  });
  els.taskCourseFilter.addEventListener("change", () => {
    taskFilters.courseId = els.taskCourseFilter.value;
    renderTasks();
  });

  els.researchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.research.push({
      id: makeId(),
      title: data.title.trim(),
      project: data.project.trim(),
      kind: data.kind,
      dueDate: data.dueDate,
      hours: Number(data.hours || 1),
      weight: Number(data.weight || 2),
      details: data.details.trim(),
      completed: false,
    });
    event.target.reset();
    persistAndRender();
  });

  els.examForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const exam = {
      id: makeId(),
      title: data.title.trim(),
      courseId: data.courseId,
      examDate: data.examDate,
      difficulty: Number(data.difficulty || 2),
      scope: data.scope.trim(),
    };
    if (data.id) {
      state.exams = state.exams.map((item) => (item.id === data.id ? { ...item, ...exam, id: data.id } : item));
    } else {
      state.exams.push(exam);
    }
    resetExamForm();
    persistAndRender();
  });
  els.cancelExamEdit.addEventListener("click", resetExamForm);

  els.lessonForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    state.lessons.push({
      id: makeId(),
      title: data.title.trim(),
      courseId: data.courseId,
      date: data.date,
      content: data.content.trim(),
      sourceName: "手动输入",
    });
    event.target.reset();
    persistAndRender();
  });

  els.extractNoteFile.addEventListener("click", extractNoteFile);
  els.noteForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const content = (data.content || "").trim();
    if (!content) {
      alert("请先读取笔记文件，或者手动填写笔记内容。");
      return;
    }
    if (!data.id && isDuplicateRecord("notes", {
      title: data.title.trim(),
      courseId: data.courseId,
      fileName: els.noteFile.files[0]?.name || "手动输入",
      content,
    })) {
      alert("这个笔记文件已经导入过了，已跳过重复保存。");
      return;
    }
    const existing = state.notes.find((note) => note.id === data.id);
    const note = {
      id: makeId(),
      title: data.title.trim(),
      courseId: data.courseId,
      date: data.date,
      fileName: els.noteFile.files[0]?.name || existing?.fileName || "手动输入",
      content,
      createdAt: existing?.createdAt || new Date().toISOString(),
      difficulty: data.difficulty || "normal",
      reviewCount: Number(existing?.reviewCount || 0),
      nextReviewDate: existing?.nextReviewDate || nextReviewDate(0, data.date, data.difficulty || "normal"),
    };
    if (data.id) {
      state.notes = state.notes.map((item) => (item.id === data.id ? { ...item, ...note, id: data.id } : item));
    } else {
      state.notes.push(note);
    }
    resetNoteForm();
    persistAndRender();
  });
  els.cancelNoteEdit.addEventListener("click", resetNoteForm);

  els.importKind.addEventListener("change", updateImportLabels);
  els.importText.addEventListener("input", () => {
    els.importPreview.textContent = els.importText.value.trim() || "还没有读取文件或粘贴文本。";
    autofillImportForm();
  });
  els.importFile.addEventListener("change", autofillImportForm);
  els.extractFile.addEventListener("click", extractImportFile);
  els.importForm.addEventListener("submit", importInformation);
  updateImportLabels();

  els.seedDemo.addEventListener("click", () => {
    const demo = createDemoData();
    state.courses = demo.courses;
    state.tasks = demo.tasks;
    state.research = demo.research;
    state.exams = demo.exams;
    state.lessons = demo.lessons;
    state.notes = demo.notes;
    state.progress = {};
    state.rescheduleBoosts = {};
    state.planOffsets = {};
    persistAndRender();
  });

  els.clearData.addEventListener("click", () => {
    if (!confirm("确定清空所有课程、任务和考试数据吗？")) return;
    state.courses = [];
    state.tasks = [];
    state.research = [];
    state.exams = [];
    state.lessons = [];
    state.notes = [];
    state.progress = {};
    state.rescheduleBoosts = {};
    state.planOffsets = {};
    persistAndRender();
  });
  els.exportData.addEventListener("click", exportState);
  els.importDataButton.addEventListener("click", () => els.importDataFile.click());
  els.importDataFile.addEventListener("change", importStateFromFile);

  els.regenPlan.addEventListener("click", renderPlan);
  els.rescheduleToday.addEventListener("click", rescheduleTodayUnfinished);
  els.prevMonth.addEventListener("click", () => {
    calendarCursor.setMonth(calendarCursor.getMonth() - 1);
    renderCalendar();
  });
  els.nextMonth.addEventListener("click", () => {
    calendarCursor.setMonth(calendarCursor.getMonth() + 1);
    renderCalendar();
  });
  els.todayMonth.addEventListener("click", () => {
    calendarCursor = new Date();
    renderCalendar();
  });
  els.calendarFilters?.addEventListener("change", () => {
    calendarFilters = Object.fromEntries(Array.from(els.calendarFilters.querySelectorAll("input")).map((input) => [input.value, input.checked]));
    renderCalendar();
  });
  els.reviewCourse.addEventListener("change", renderReview);
  els.runSearch.addEventListener("click", renderSearch);
  els.searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") renderSearch();
  });
  els.searchScope.addEventListener("change", renderSearch);
  els.aiForm.addEventListener("submit", runAiAnalysis);
  els.readAiImportFile.addEventListener("click", readAiImportFile);
  els.aiImportForm.addEventListener("submit", runAiImport);
}

function switchView(view) {
  els.navItems.forEach((item) => item.classList.toggle("active", item.dataset.view === view));
  els.views.forEach((section) => section.classList.remove("active"));
  document.querySelector(`#${view}View`).classList.add("active");
  els.viewTitle.textContent = viewTitles[view];
  if (view === "plan") renderPlan();
  if (view === "calendar") renderCalendar();
  if (view === "review") renderReview();
  if (view === "search") renderSearch();
}

function render() {
  renderCourseOptions();
  renderDashboard();
  renderCourses();
  renderLessons();
  renderNotes();
  renderTasks();
  renderResearch();
  renderExams();
  renderPlan();
  renderCalendar();
  renderReviewCourseOptions();
  renderReview();
}

function renderDashboard() {
  const openTasks = state.tasks.filter((task) => !task.completed);
  const urgent = openTasks.filter((task) => daysUntil(task.dueDate) <= 7 && daysUntil(task.dueDate) >= 0);
  const priorityItems = getPriorityItems().slice(0, 6);
  const todayPlan = generatePlan(1)[0]?.items || [];

  els.courseCount.textContent = state.courses.length;
  els.openTaskCount.textContent = openTasks.length;
  els.urgentCount.textContent = urgent.length;
  els.examCount.textContent = state.exams.length;
  els.lessonCount.textContent = state.lessons.length;
  els.noteCount.textContent = state.notes.length;
  els.researchCount.textContent = state.research.filter((item) => !item.completed).length;
  els.focusHint.textContent = priorityItems[0]
    ? `当前最该处理：${priorityItems[0].title}`
    : "先录入课程、任务和考试信息，我会帮你排出学习顺序。";

  els.todayList.innerHTML = todayPlan.length
    ? todayPlan.map(renderPlanTask).join("")
    : "暂无安排，先添加一些课程任务。";

  els.priorityList.innerHTML = priorityItems.length
    ? priorityItems.map(renderPriorityItem).join("")
    : "还没有可排序的任务。";

  els.studySummary.textContent = createSummary(priorityItems, urgent);
}

function renderCourses() {
  els.courseList.innerHTML = state.courses.length
    ? state.courses
        .map(
          (course) => `
            <article class="item course-item">
              <div class="item-head">
                <div>
                  <span class="item-title-label">课程名称</span>
                  <h4>${escapeHtml(course.name)}</h4>
                  <span class="tag">${escapeHtml(course.meta || "未填写老师/地点")}</span>
                </div>
                <div class="row-actions">
                  <button class="small-button" onclick="editCourse('${course.id}')">编辑</button>
                  <button class="small-button" onclick="removeCourse('${course.id}')">删除</button>
                </div>
              </div>
              <div class="item-fields">
                ${renderField("老师 / 地点", course.meta || "未填写老师/地点")}
                ${renderField("上课时间", course.schedule || "未填写上课时间")}
                ${renderField("本学期学习目标", course.goal || "未填写学习目标")}
              </div>
            </article>
          `
        )
        .join("")
    : "还没有课程。";
}

function renderLessons() {
  const sorted = [...state.lessons].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  els.lessonList.innerHTML = sorted.length
    ? sorted
        .map((lesson) => `
          <article class="item">
            <div class="item-head">
              <div>
                <h4>${escapeHtml(lesson.title)}</h4>
                <div class="tag-row">
                  <span class="tag">${escapeHtml(getCourseName(lesson.courseId))}</span>
                  <span class="tag">${escapeHtml(lesson.date || "未填写日期")}</span>
                  <span class="tag">${escapeHtml(lesson.sourceName || "手动输入")}</span>
                </div>
              </div>
              <button class="small-button" onclick="removeLesson('${lesson.id}')">删除</button>
            </div>
            ${renderField("学习内容", lesson.content || "未填写学习内容")}
          </article>
        `)
        .join("")
    : "还没有课次内容。";
}

function renderNotes() {
  const sorted = [...state.notes].sort((a, b) => {
    const dateDiff = new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0);
    if (dateDiff !== 0) return dateDiff;
    return getCourseName(a.courseId).localeCompare(getCourseName(b.courseId), "zh-CN");
  });

  els.noteList.innerHTML = sorted.length
    ? sorted
        .map((note) => `
          <article class="item">
            <div class="item-head">
              <div>
                <h4>${escapeHtml(note.title)}</h4>
                <div class="tag-row">
                  <span class="tag">${escapeHtml(getCourseName(note.courseId))}</span>
                  <span class="tag">${escapeHtml(note.date || "未填写日期")}</span>
                  <span class="tag">${escapeHtml(note.fileName || "笔记文件")}</span>
                  <span class="tag low">已复习 ${Number(note.reviewCount || 0)} 次</span>
                  <span class="tag">${escapeHtml(noteDifficultyLabel(note.difficulty))}</span>
                  <span class="tag ${urgencyClass(daysUntil(note.nextReviewDate || nextReviewDate(0, note.date, note.difficulty)))}">下次 ${escapeHtml(note.nextReviewDate || nextReviewDate(0, note.date, note.difficulty))}</span>
                </div>
              </div>
              <div class="row-actions">
                <button class="small-button" onclick="editNote('${note.id}')">编辑</button>
                <button class="small-button" onclick="markNoteReviewed('${note.id}')">已复习</button>
                <button class="small-button" onclick="removeNote('${note.id}')">删除</button>
              </div>
            </div>
            ${renderField("笔记内容", trimLongText(note.content || "未提取到笔记内容", 420))}
          </article>
        `)
        .join("")
    : "还没有课堂笔记。";
}

function renderTasks() {
  renderDdlOverview();
  const sorted = state.tasks.filter(matchesTaskFilters).sort(compareTasksByDeadline);
  els.taskList.innerHTML = sorted.length
    ? sorted
        .map((task) => {
          const course = getCourseName(task.courseId);
          const due = daysUntil(task.dueDate);
          const isOverdue = due < 0 && !task.completed;
          return `
            <article class="item ${isOverdue ? "overdue-item" : ""}">
              <div class="item-head">
                <div>
                  <h4>${escapeHtml(task.title)}</h4>
                  <div class="tag-row">
                    <span class="tag">${escapeHtml(course)}</span>
                    <span class="tag ${urgencyClass(due)}">${dueLabel(task.dueDate)}</span>
                    ${isOverdue ? '<span class="tag overdue">需要重新安排</span>' : ""}
                    <span class="tag">${task.hours} 小时</span>
                    ${task.completed ? '<span class="tag low">已完成</span>' : ""}
                  </div>
                </div>
                <div class="row-actions">
                  <button class="small-button" onclick="editTask('${task.id}')">编辑</button>
                  <button class="small-button" onclick="toggleTask('${task.id}')">${task.completed ? "恢复" : "完成"}</button>
                  <button class="small-button" onclick="removeTask('${task.id}')">删除</button>
                </div>
              </div>
              ${renderField("任务要求", task.details || "未填写详细要求")}
            </article>
          `;
        })
        .join("")
    : state.tasks.length
      ? "没有符合筛选条件的任务。"
      : "还没有任务。";
}

function matchesTaskFilters(task) {
  const days = daysUntil(task.dueDate);
  const statusMatch =
    taskFilters.status === "all" ||
    (taskFilters.status === "open" && !task.completed) ||
    (taskFilters.status === "completed" && task.completed) ||
    (taskFilters.status === "overdue" && !task.completed && days < 0) ||
    (taskFilters.status === "today" && !task.completed && days === 0) ||
    (taskFilters.status === "threeDays" && !task.completed && days >= 0 && days <= 3) ||
    (taskFilters.status === "week" && !task.completed && days >= 0 && days <= 7) ||
    (taskFilters.status === "future" && !task.completed && days > 7);
  const courseMatch = taskFilters.courseId === "all" || task.courseId === taskFilters.courseId;
  return statusMatch && courseMatch;
}

function renderDdlOverview() {
  const openTasks = state.tasks.filter((task) => !task.completed);
  const buckets = [
    ["今天截止", (task) => daysUntil(task.dueDate) === 0],
    ["3 天内", (task) => daysUntil(task.dueDate) >= 0 && daysUntil(task.dueDate) <= 3],
    ["7 天内", (task) => daysUntil(task.dueDate) >= 0 && daysUntil(task.dueDate) <= 7],
    ["更远", (task) => daysUntil(task.dueDate) > 7],
  ];
  const overdue = openTasks.filter((task) => daysUntil(task.dueDate) < 0).length;
  const html = [
    `<button type="button" class="ddl-card danger" onclick="setTaskStatusFilter('overdue')"><span>已逾期</span><strong>${overdue}</strong></button>`,
    ...buckets.map(([label, test]) => {
      const value = openTasks.filter(test).length;
      const filter = { "今天截止": "today", "3 天内": "threeDays", "7 天内": "week", "更远": "future" }[label] || "open";
      return `<button type="button" class="ddl-card" onclick="setTaskStatusFilter('${filter}')"><span>${label}</span><strong>${value}</strong></button>`;
    }),
  ].join("");
  els.ddlOverview.innerHTML = html;
  els.dashboardDdlOverview.innerHTML = html;
}

function setTaskStatusFilter(status) {
  taskFilters.status = status;
  els.taskStatusFilter.value = status;
  switchView("tasks");
  renderTasks();
}

function renderResearch() {
  const sorted = [...state.research].sort(compareTasksByDeadline);
  els.researchList.innerHTML = sorted.length
    ? sorted
        .map((item) => {
          const due = daysUntil(item.dueDate);
          return `
            <article class="item">
              <div class="item-head">
                <div>
                  <h4>${escapeHtml(item.title)}</h4>
                  <div class="tag-row">
                    <span class="tag">${escapeHtml(item.project || "科研任务")}</span>
                    <span class="tag low">${escapeHtml(researchKindLabel(item.kind))}</span>
                    <span class="tag ${urgencyClass(due)}">${dueLabel(item.dueDate)}</span>
                    <span class="tag">${item.hours} 小时</span>
                    ${item.completed ? '<span class="tag low">已完成</span>' : ""}
                  </div>
                </div>
                <div class="row-actions">
                  <button class="small-button" onclick="toggleResearch('${item.id}')">${item.completed ? "恢复" : "完成"}</button>
                  <button class="small-button" onclick="removeResearch('${item.id}')">删除</button>
                </div>
              </div>
              ${renderField("任务详情", item.details || "未填写任务详情")}
            </article>
          `;
        })
        .join("")
    : "还没有科研任务。";
}

function renderExams() {
  const sorted = [...state.exams].sort((a, b) => new Date(a.examDate) - new Date(b.examDate));
  els.examList.innerHTML = sorted.length
    ? sorted
        .map((exam) => {
          const due = daysUntil(exam.examDate);
          return `
            <article class="item">
              <div class="item-head">
                <div>
                  <h4>${escapeHtml(exam.title)}</h4>
                  <div class="tag-row">
                    <span class="tag">${escapeHtml(getCourseName(exam.courseId))}</span>
                    <span class="tag ${urgencyClass(due)}">${dueLabel(exam.examDate)}</span>
                    <span class="tag">难度 ${difficultyText(exam.difficulty)}</span>
                  </div>
                </div>
                <div class="row-actions">
                  <button class="small-button" onclick="editExam('${exam.id}')">编辑</button>
                  <button class="small-button" onclick="removeExam('${exam.id}')">删除</button>
                </div>
              </div>
              ${renderField("考试范围", exam.scope || "未填写考试范围")}
            </article>
          `;
        })
        .join("")
    : "还没有考试。";
}

function renderPlan() {
  const days = Number(els.planDays.value || 14);
  const plan = generatePlan(days);
  els.planList.innerHTML = plan.some((day) => day.items.length)
    ? plan
        .map(
          (day) => `
            <section class="plan-day">
              <h4>${formatDate(day.date)} ${weekday(day.date)}</h4>
              ${
                day.items.length
                  ? day.items.map(renderPlanTask).join("")
                  : '<div class="empty-state">今天没有强制安排，可以整理笔记或休息。</div>'
              }
            </section>
          `
        )
        .join("")
    : "暂无计划。";
}

function renderCalendar() {
  const year = calendarCursor.getFullYear();
  const month = calendarCursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());
  const todayKey = formatDate(new Date());
  const eventsByDate = buildCalendarEvents(start, 42);
  const weekdayNames = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  calendarEventDetails = new Map();

  els.calendarTitle.textContent = `${year} 年 ${month + 1} 月`;
  renderCalendarBrief();
  els.calendarGrid.innerHTML = [
    ...weekdayNames.map((name) => `<div class="calendar-weekday">${name}</div>`),
    ...Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = formatDate(date);
      const events = (eventsByDate.get(key) || []).filter((event) => calendarFilters[event.type] !== false);
      const pressure = getPressureLevel(events);
      return `
        <article class="calendar-cell ${date.getMonth() === month ? "" : "muted-month"} ${key === todayKey ? "today" : ""} ${pressure}">
          <div class="calendar-date">
            <strong>${date.getDate()}</strong>
            <span>${pressureLabel(events)}</span>
          </div>
          <div class="calendar-events">
            ${events.map(renderCalendarEvent).join("")}
          </div>
        </article>
      `;
    }),
  ].join("");
}

function renderCalendarBrief() {
  if (!els.calendarBrief) return;
  const today = new Date();
  const urgentItems = getUpcomingDeadlineItems(3);
  els.calendarBrief.innerHTML = `
    <div class="today-brief">
      <span>今天</span>
      <strong>${formatDate(today)} ${weekday(today)}</strong>
    </div>
    <div class="deadline-brief">
      <span>三天内 DDL</span>
      ${
        urgentItems.length
          ? urgentItems.map((item) => `<em class="${item.className}">${escapeHtml(item.text)}</em>`).join("")
          : "<em>三天内暂无 DDL</em>"
      }
    </div>
  `;
}

function getUpcomingDeadlineItems(days) {
  const items = [];
  state.tasks.filter((task) => !task.completed).forEach((task) => {
    const left = daysUntil(task.dueDate);
    if (left >= 0 && left <= days) {
      items.push({
        date: task.dueDate,
        className: urgencyClass(left),
        text: `${dueLabel(task.dueDate)}｜${getCourseName(task.courseId)}：${task.title}`,
      });
    }
  });
  state.research.filter((item) => !item.completed).forEach((item) => {
    const left = daysUntil(item.dueDate);
    if (left >= 0 && left <= days) {
      items.push({
        date: item.dueDate,
        className: urgencyClass(left),
        text: `${dueLabel(item.dueDate)}｜${researchKindLabel(item.kind)}：${item.title}`,
      });
    }
  });
  state.exams.forEach((exam) => {
    const left = daysUntil(exam.examDate);
    if (left >= 0 && left <= days) {
      items.push({
        date: exam.examDate,
        className: "high",
        text: `${dueLabel(exam.examDate)}｜考试：${getCourseName(exam.courseId)} ${exam.title}`,
      });
    }
  });
  return items.sort((a, b) => new Date(a.date) - new Date(b.date)).slice(0, 6);
}

function renderCalendarEvent(event) {
  const id = makeId();
  calendarEventDetails.set(id, event);
  return `
    <button class="calendar-event ${event.type}" type="button" onclick="showCalendarEventDetail('${escapeAttribute(id)}')">
      <strong>${escapeHtml(event.kind || calendarEventKind(event.type))}</strong>
      <span>${escapeHtml(event.label)}</span>
      ${event.reason ? `<small>${escapeHtml(event.reason)}</small>` : ""}
      ${event.meta ? `<em>${escapeHtml(event.meta)}</em>` : ""}
    </button>
  `;
}

function showCalendarEventDetail(id) {
  const event = calendarEventDetails.get(id);
  if (!event) return;
  let overlay = document.querySelector("#calendarDetailOverlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "calendarDetailOverlay";
    overlay.className = "calendar-detail-overlay";
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `
    <article class="calendar-detail">
      <button class="small-button calendar-detail-close" type="button" onclick="closeCalendarEventDetail()">关闭</button>
      <span class="tag">${escapeHtml(event.kind || calendarEventKind(event.type))}</span>
      <h3>${escapeHtml(event.label)}</h3>
      ${event.reason ? renderField("安排原因", event.reason) : ""}
      ${event.meta ? renderField("说明", event.meta) : ""}
      ${event.detail ? renderField("详情", event.detail) : ""}
      ${event.date ? renderField("日期", event.date) : ""}
    </article>
  `;
  overlay.classList.add("show");
}

function closeCalendarEventDetail() {
  document.querySelector("#calendarDetailOverlay")?.classList.remove("show");
}

function calendarEventKind(type) {
  return {
    course: "上课",
    task: "DDL",
    research: "科研",
    exam: "考试",
    study: "今日安排",
  }[type] || "安排";
}

function renderPlanTask(item) {
  const status = getPlanStatus(item.key);
  const statusText = statusLabels[status] || statusLabels.todo;
  return `
    <div class="plan-task ${status}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.subtitle)}</span>
      </div>
      <div class="plan-status">
        <em>${statusText}</em>
        <button type="button" class="${status === "doing" ? "active" : ""}" onclick="setPlanStatus('${item.key}', 'doing')">进行中</button>
        <button type="button" class="${status === "done" ? "active" : ""}" onclick="setPlanStatus('${item.key}', 'done')">完成</button>
        <button type="button" class="${status === "skipped" ? "active" : ""}" onclick="setPlanStatus('${item.key}', 'skipped')">跳过</button>
        <button type="button" onclick="postponePlanItem('${item.key}', '${item.sourceId}', 1)">明天</button>
        <button type="button" onclick="postponePlanItem('${item.key}', '${item.sourceId}', 2)">后天</button>
        <button type="button" class="${status === "delayed" ? "active" : ""}" onclick="delayPlanItem('${item.key}', '${item.sourceId}')">延期</button>
      </div>
    </div>
  `;
}

function renderPriorityItem(item) {
  return `
    <article class="item">
      <div class="item-head">
        <div>
          <h4>${escapeHtml(item.title)}</h4>
          <div class="tag-row">
            <span class="tag">${escapeHtml(item.course)}</span>
            <span class="tag ${urgencyClass(item.daysLeft)}">${item.deadlineText}</span>
            <span class="tag">${item.type}</span>
          </div>
        </div>
        <strong>${Math.round(item.score)}</strong>
      </div>
      <p>${escapeHtml(item.reason)}</p>
    </article>
  `;
}

function buildCalendarEvents(startDate, dayCount) {
  const map = new Map();
  const addEvent = (dateString, event) => {
    if (!dateString) return;
    if (!map.has(dateString)) map.set(dateString, []);
    map.get(dateString).push(event);
  };

  state.tasks.filter((task) => !task.completed).forEach((task) => {
    addEvent(task.dueDate, {
      type: "task",
      kind: "截止",
      label: `${getCourseName(task.courseId)} · ${task.title}`,
      meta: task.details ? trimLongText(task.details, 42) : `${task.hours || 1} 小时`,
      reason: calendarDeadlineReason(task.dueDate, task.weight),
      detail: task.details || "未填写详细要求",
      date: task.dueDate,
      weight: task.weight || 2,
    });
  });

  state.research.filter((item) => !item.completed).forEach((item) => {
    addEvent(item.dueDate, {
      type: "research",
      kind: "科研",
      label: `${researchKindLabel(item.kind)} · ${item.title}`,
      meta: item.details ? trimLongText(item.details, 42) : `${item.hours || 1} 小时`,
      reason: calendarDeadlineReason(item.dueDate, item.weight),
      detail: item.details || "未填写任务详情",
      date: item.dueDate,
      weight: item.weight || 2,
    });
  });

  state.exams.forEach((exam) => {
    addEvent(exam.examDate, {
      type: "exam",
      kind: "考试",
      label: `${getCourseName(exam.courseId)} · ${exam.title}`,
      meta: exam.scope ? `复习：${trimLongText(exam.scope, 42)}` : `难度 ${difficultyText(exam.difficulty)}`,
      reason: calendarExamReason(exam.examDate, exam.difficulty),
      detail: exam.scope || "未填写考试范围",
      date: exam.examDate,
      weight: 3,
    });
  });

  state.notes.forEach((note) => {
    const reviewDate = note.nextReviewDate || nextReviewDate(Number(note.reviewCount || 0), note.date, note.difficulty);
    addEvent(reviewDate, {
      type: "study",
      kind: "笔记复习",
      label: `${getCourseName(note.courseId)} · ${note.title}`,
      meta: `已复习 ${Number(note.reviewCount || 0)} 次`,
      reason: noteReviewReason(note),
      detail: note.content || "未提取到笔记内容",
      date: reviewDate,
      weight: 1,
    });
  });

  const weekdayCourseMap = buildWeekdayCourseMap();
  for (let i = 0; i < dayCount; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const key = formatDate(date);
    const courses = weekdayCourseMap.get(date.getDay()) || [];
    courses.forEach((course) => {
      addEvent(key, {
        type: "course",
        kind: "上课",
        label: course.name,
        meta: course.schedule || course.meta || "",
        reason: "因为这是课程表里的上课日",
        detail: [course.meta, course.schedule, course.goal].filter(Boolean).join("\n") || "未填写课程详情",
        date: key,
        weight: 1,
      });
    });
  }

  const plan = generatePlan(dayCount);
  plan.forEach((day) => {
    const key = formatDate(day.date);
    day.items.forEach((item) => {
      addEvent(key, {
        type: "study",
        kind: item.title.includes("复习") || item.subtitle.includes("复习") || item.subtitle.includes("回顾") ? "复习" : "今日安排",
        label: item.title,
        meta: `${item.course} · ${item.deadlineText}`,
        reason: item.reason,
        detail: item.subtitle,
        date: key,
        weight: 1,
      });
    });
  });

  map.forEach((events) => {
    events.sort((a, b) => eventWeight(b) - eventWeight(a));
  });
  return map;
}

function buildWeekdayCourseMap() {
  const map = new Map();
  state.courses.forEach((course) => {
    extractWeekdays(course.schedule).forEach((day) => {
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(course);
    });
  });
  return map;
}

function extractWeekdays(text) {
  const source = text || "";
  const matches = [
    ["周日", 0],
    ["星期日", 0],
    ["周天", 0],
    ["周一", 1],
    ["星期一", 1],
    ["周二", 2],
    ["星期二", 2],
    ["周三", 3],
    ["星期三", 3],
    ["周四", 4],
    ["星期四", 4],
    ["周五", 5],
    ["星期五", 5],
    ["周六", 6],
    ["星期六", 6],
  ];
  return [...new Set(matches.filter(([label]) => source.includes(label)).map(([, day]) => day))];
}

function eventWeight(event) {
  const base = { exam: 5, task: 4, study: 2, course: 1 }[event.type] || 1;
  return base + Number(event.weight || 0);
}

function getPressureLevel(events) {
  const score = events.reduce((total, event) => total + eventWeight(event), 0);
  if (score >= 10 || events.length >= 6) return "pressure-high";
  if (score >= 6 || events.length >= 3) return "pressure-medium";
  if (events.length > 0) return "pressure-low";
  return "";
}

function pressureLabel(events) {
  const level = getPressureLevel(events);
  if (level === "pressure-high") return "压力高";
  if (level === "pressure-medium") return "较忙";
  if (level === "pressure-low") return "有安排";
  return "";
}

function renderCourseOptions() {
  const currentTaskFilterCourse = els.taskCourseFilter.value || taskFilters.courseId;
  const options = state.courses.length
    ? state.courses.map((course) => `<option value="${course.id}">${escapeHtml(course.name)}</option>`).join("")
    : '<option value="">先添加课程</option>';
  els.taskCourse.innerHTML = options;
  els.examCourse.innerHTML = options;
  els.importCourse.innerHTML = options;
  els.lessonCourse.innerHTML = options;
  els.noteCourse.innerHTML = options;
  els.taskCourseFilter.innerHTML = `<option value="all">全部课程</option>${state.courses.map((course) => `<option value="${course.id}">${escapeHtml(course.name)}</option>`).join("")}`;
  if (currentTaskFilterCourse === "all" || state.courses.some((course) => course.id === currentTaskFilterCourse)) {
    els.taskCourseFilter.value = currentTaskFilterCourse;
    taskFilters.courseId = currentTaskFilterCourse;
  } else {
    taskFilters.courseId = "all";
  }
}

function renderReviewCourseOptions() {
  const current = els.reviewCourse.value;
  els.reviewCourse.innerHTML = state.courses.length
    ? state.courses.map((course) => `<option value="${course.id}">${escapeHtml(course.name)}</option>`).join("")
    : '<option value="">先添加课程</option>';
  if (state.courses.some((course) => course.id === current)) els.reviewCourse.value = current;
}

function renderReview() {
  const courseId = els.reviewCourse.value || state.courses[0]?.id || "";
  if (courseId && els.reviewCourse.value !== courseId) els.reviewCourse.value = courseId;
  const course = state.courses.find((item) => item.id === courseId);

  if (!course) {
    els.reviewToday.innerHTML = "先添加课程后再使用复习模式。";
    els.reviewHighlights.innerHTML = "还没有足够资料。";
    els.reviewExams.innerHTML = "这门课还没有考试信息。";
    els.reviewLessons.innerHTML = "这门课还没有课次内容。";
    els.reviewNotes.innerHTML = "这门课还没有课堂笔记。";
    els.reviewTasks.innerHTML = "这门课还没有作业任务。";
    return;
  }

  const todayItems = (generatePlan(1)[0]?.items || []).filter((item) => item.subtitle.includes(course.name));
  const exams = state.exams.filter((exam) => exam.courseId === courseId);
  const lessons = state.lessons.filter((lesson) => lesson.courseId === courseId);
  const notes = state.notes.filter((note) => note.courseId === courseId);
  const tasks = state.tasks.filter((task) => task.courseId === courseId);
  tasks.sort(compareTasksByDeadline);
  const highlights = buildReviewHighlights(course, exams, lessons, notes, tasks);

  els.reviewToday.innerHTML = todayItems.length ? todayItems.map(renderPlanTask).join("") : "今天暂无这门课的复习任务。";
  els.reviewHighlights.innerHTML = highlights.length ? highlights.map(renderHighlight).join("") : "还没有足够资料。";
  els.reviewExams.innerHTML = exams.length ? exams.map((exam) => renderReviewItem(exam.title, dueLabel(exam.examDate), exam.scope)).join("") : "这门课还没有考试信息。";
  els.reviewLessons.innerHTML = lessons.length ? lessons.map((lesson) => renderReviewItem(lesson.title, lesson.date || "未填写日期", lesson.content)).join("") : "这门课还没有课次内容。";
  els.reviewNotes.innerHTML = notes.length ? notes.map((note) => renderReviewItem(note.title, note.date || note.fileName || "课堂笔记", trimLongText(note.content, 520))).join("") : "这门课还没有课堂笔记。";
  els.reviewTasks.innerHTML = tasks.length ? tasks.map((task) => renderReviewItem(task.title, dueLabel(task.dueDate), task.details)).join("") : "这门课还没有作业任务。";
}

function renderReviewItem(title, meta, body) {
  return `
    <article class="item">
      <h4>${escapeHtml(title)}</h4>
      <span class="tag">${escapeHtml(meta)}</span>
      <p>${escapeHtml(body || "暂无详细内容")}</p>
    </article>
  `;
}

function renderHighlight(text) {
  return `
    <article class="highlight-item">
      <strong>${escapeHtml(text)}</strong>
    </article>
  `;
}

function buildReviewHighlights(course, exams, lessons, notes, tasks) {
  const text = [
    course.goal,
    ...exams.map((item) => item.scope),
    ...lessons.map((item) => item.content),
    ...notes.map((item) => item.content),
    ...tasks.map((item) => item.details),
  ].filter(Boolean).join("；");

  return text
    .split(/[；;。.\n、,，]/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 4)
    .slice(0, 8);
}

function renderSearch() {
  const query = els.searchInput.value.trim();
  const scope = els.searchScope.value;
  if (!query) {
    els.searchSummary.textContent = "输入关键词后开始搜索。";
    els.searchResults.innerHTML = "暂无搜索结果。";
    return;
  }

  const results = searchMaterials(query, scope);
  els.searchSummary.textContent = results.length
    ? `找到 ${results.length} 条结果：${query}`
    : `没有找到和「${query}」相关的资料。`;
  els.searchResults.innerHTML = results.length
    ? results.map((result) => renderSearchResult(result, query)).join("")
    : "暂无搜索结果。";
}

function searchMaterials(query, scope) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  return buildSearchIndex()
    .filter((item) => scope === "all" || item.group === scope)
    .map((item) => {
      const haystack = `${item.title} ${item.body}`.toLowerCase();
      const score = terms.reduce((total, term) => total + countMatches(haystack, term), 0);
      return score > 0 ? { ...item, score, snippet: makeSnippet(item.body, terms) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.course.localeCompare(b.course, "zh-CN"));
}

function buildSearchIndex() {
  const items = [];
  state.courses.forEach((course) => {
    items.push({
      group: "courses",
      type: "课程目标",
      course: course.name,
      title: course.name,
      meta: course.meta || "课程信息",
      body: `${course.schedule || ""}\n${course.goal || ""}`,
    });
  });

  state.lessons.forEach((lesson) => {
    items.push({
      group: "lessons",
      type: "课次内容",
      course: getCourseName(lesson.courseId),
      title: lesson.title,
      meta: lesson.date || lesson.sourceName || "课次内容",
      body: lesson.content || "",
    });
  });

  state.notes.forEach((note) => {
    items.push({
      group: "notes",
      type: "课堂笔记",
      course: getCourseName(note.courseId),
      title: note.title,
      meta: note.date || note.fileName || "课堂笔记",
      body: note.content || "",
    });
  });

  state.tasks.forEach((task) => {
    items.push({
      group: "tasks",
      type: "作业 / DDL",
      course: getCourseName(task.courseId),
      title: task.title,
      meta: dueLabel(task.dueDate),
      body: task.details || "",
    });
  });

  state.research.forEach((item) => {
    items.push({
      group: "research",
      type: "科研任务",
      course: item.project || "科研",
      title: item.title,
      meta: dueLabel(item.dueDate),
      body: item.details || "",
    });
  });

  state.exams.forEach((exam) => {
    items.push({
      group: "exams",
      type: "考试范围",
      course: getCourseName(exam.courseId),
      title: exam.title,
      meta: dueLabel(exam.examDate),
      body: exam.scope || "",
    });
  });

  return items.filter((item) => `${item.title}${item.body}`.trim());
}

function renderSearchResult(result, query) {
  return `
    <article class="search-result">
      <div class="item-head">
        <div>
          <h4>${escapeHtml(result.title)}</h4>
          <div class="tag-row">
            <span class="tag">${escapeHtml(result.course)}</span>
            <span class="tag low">${escapeHtml(result.type)}</span>
            <span class="tag">${escapeHtml(result.meta)}</span>
          </div>
        </div>
        <strong>${result.score}</strong>
      </div>
      <p>${highlightText(result.snippet || result.body, query)}</p>
    </article>
  `;
}

function countMatches(text, term) {
  if (!term) return 0;
  return text.split(term).length - 1;
}

function makeSnippet(body, terms) {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  if (!text) return "标题中匹配到关键词。";
  const lower = text.toLowerCase();
  const positions = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
  const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 55);
  const end = Math.min(text.length, start + 180);
  return `${start > 0 ? "..." : ""}${text.slice(start, end)}${end < text.length ? "..." : ""}`;
}

function highlightText(text, query) {
  const terms = query.split(/\s+/).filter(Boolean).map(escapeRegExp);
  let safe = escapeHtml(text);
  terms.forEach((term) => {
    safe = safe.replace(new RegExp(`(${term})`, "gi"), "<mark>$1</mark>");
  });
  return safe;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function runAiAnalysis(event) {
  event.preventDefault();
  const text = els.aiInput.value.trim();
  const action = els.aiAction.value;
  if (!text) {
    alert("请先粘贴要分析的资料。");
    return;
  }
  if (!shouldUseBackend()) {
    els.aiOutput.textContent = "本地 AI 分析需要通过 start_sqlite_server.bat 启动后访问 http://127.0.0.1:5177。";
    return;
  }

  els.aiOutput.textContent = "正在调用本地开源模型分析，请稍等...";
  try {
    const response = await fetch(`/api/ai/analyze?action=${encodeURIComponent(action)}`, {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: text,
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    els.aiModelLabel.textContent = result.model || "本地 Ollama";
    els.aiOutput.textContent = result.text || "模型没有返回内容。";
  } catch (error) {
    els.aiOutput.textContent = `AI 暂时不可用：${error.message}\n\n安装方式建议：安装 Ollama，然后运行 ollama pull qwen2.5:7b，再重新打开 start_sqlite_server.bat。`;
  }
}

async function readAiImportFile() {
  const file = els.aiImportFile.files[0];
  if (!file) {
    alert("请先选择一个 PDF、DOCX 或 TXT 文件。");
    return;
  }

  els.aiImportStatus.textContent = "读取文件中";
  try {
    els.aiImportInput.value = await extractTextFromFile(file);
    els.aiImportStatus.textContent = "文件已读取";
  } catch (error) {
    els.aiImportStatus.textContent = "读取失败";
    els.aiImportDraft.textContent = `读取失败：${error.message}`;
  }
}

async function runAiImport(event) {
  event.preventDefault();
  const text = els.aiImportInput.value.trim();
  if (!text) {
    alert("请先粘贴资料或上传文件。");
    return;
  }
  if (!shouldUseBackend()) {
    els.aiImportDraft.textContent = "AI 导入需要通过 start_sqlite_server.bat 启动后访问 http://127.0.0.1:5177。";
    return;
  }

  els.aiImportStatus.textContent = "AI 分析中";
  els.aiImportDraft.textContent = "正在让本地模型提取类型、重点和建议任务...";
  try {
    const response = await fetch("/api/ai/analyze?action=import", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: text,
    });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    const draft = parseAiImportDraft(result.text);
    els.aiImportStatus.textContent = draft ? "等待确认" : "需要手动确认";
    renderAiImportDraft(draft, result.text, text);
  } catch (error) {
    els.aiImportStatus.textContent = "AI 不可用";
    els.aiImportDraft.textContent = `AI 暂时不可用：${error.message}\n\n确认 Ollama 已安装并已下载 qwen2.5:7b。`;
  }
}

function parseAiImportDraft(text) {
  const raw = String(text || "").trim();
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  try {
    const parsed = JSON.parse(jsonText);
    return {
      type: ["lesson", "task", "research", "exam", "note", "unknown"].includes(parsed.type) ? parsed.type : "unknown",
      title: parsed.title || "",
      courseName: parsed.courseName || "",
      date: parsed.date || "",
      hours: Number(parsed.hours || 3),
      level: Number(parsed.level || 2),
      summary: parsed.summary || "",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      suggestedTasks: Array.isArray(parsed.suggestedTasks) ? parsed.suggestedTasks : [],
      content: parsed.content || "",
      uncertain: Array.isArray(parsed.uncertain) ? parsed.uncertain : [],
    };
  } catch {
    return null;
  }
}

function renderAiImportDraft(draft, rawText, originalText) {
  if (!draft) {
    els.aiImportDraft.innerHTML = `
      <div class="summary-text">AI 返回内容不是标准 JSON，请手动复制有用信息到普通导入页面。</div>
      <pre class="ai-raw">${escapeHtml(rawText || "无返回内容")}</pre>
    `;
    return;
  }

  const courseOptions = state.courses.length
    ? state.courses.map((course) => `<option value="${course.id}" ${course.name.includes(draft.courseName) || draft.courseName.includes(course.name) ? "selected" : ""}>${escapeHtml(course.name)}</option>`).join("")
    : '<option value="">先添加课程</option>';

  els.aiImportDraft.innerHTML = `
    <form class="ai-confirm-form" id="aiConfirmForm">
      <label>资料类型
        <select name="type">
          ${["lesson", "task", "research", "exam", "note"].map((type) => `<option value="${type}" ${draft.type === type ? "selected" : ""}>${typeLabel(type)}</option>`).join("")}
        </select>
      </label>
      <label>所属课程<select name="courseId">${courseOptions}</select></label>
      <label>标题<input name="title" value="${escapeAttribute(draft.title || "AI 导入资料")}" /></label>
      <label>日期 / DDL / 考试时间<input name="date" type="date" value="${escapeAttribute(draft.date)}" /></label>
      <label>预计耗时<input name="hours" type="number" min="1" max="80" value="${Number(draft.hours || 3)}" /></label>
      <label>重要程度 / 难度
        <select name="level">
          <option value="3" ${draft.level === 3 ? "selected" : ""}>高</option>
          <option value="2" ${draft.level === 2 ? "selected" : ""}>中</option>
          <option value="1" ${draft.level === 1 ? "selected" : ""}>低</option>
        </select>
      </label>
      <label>保存正文<textarea name="content" rows="8">${escapeHtml(draft.content || originalText)}</textarea></label>
      <div class="ai-confirm-section">
        <h4>提前提取的重点</h4>
        ${renderAiList(draft.keyPoints)}
      </div>
      <div class="ai-confirm-section">
        <h4>建议拆分任务</h4>
        ${renderAiList(draft.suggestedTasks)}
      </div>
      <div class="ai-confirm-section">
        <h4>需要你确认</h4>
        ${renderAiList(draft.uncertain.length ? draft.uncertain : ["请检查类型、课程和日期是否正确。"])}
      </div>
      <button class="primary-button" type="submit">确认保存</button>
    </form>
  `;

  document.querySelector("#aiConfirmForm").addEventListener("submit", saveAiImportDraft);
}

function saveAiImportDraft(event) {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target));
  const content = data.content.trim();
  const title = data.title.trim() || "AI 导入资料";

  if (data.type === "lesson") {
    state.lessons.push({ id: makeId(), title, courseId: data.courseId, date: data.date, content, sourceName: "AI 导入" });
  }
  if (data.type === "note") {
    state.notes.push({ id: makeId(), title, courseId: data.courseId, date: data.date, fileName: "AI 导入", content, createdAt: new Date().toISOString(), difficulty: "normal", reviewCount: 0, nextReviewDate: nextReviewDate(0, data.date, "normal") });
  }
  if (data.type === "task") {
    if (!data.date) {
      alert("作业/CW 需要确认 DDL。");
      return;
    }
    state.tasks.push({ id: makeId(), title, courseId: data.courseId, dueDate: data.date, hours: Number(data.hours || 3), weight: Number(data.level || 2), details: content, completed: false, sourceName: "AI 导入" });
  }
  if (data.type === "research") {
    if (!data.date) {
      alert("科研任务需要确认截止日期或组会日期。");
      return;
    }
    state.research.push({ id: makeId(), title, project: "AI 导入科研", kind: "other", dueDate: data.date, hours: Number(data.hours || 3), weight: Number(data.level || 2), details: content, completed: false });
  }
  if (data.type === "exam") {
    if (!data.date) {
      alert("考试需要确认考试时间。");
      return;
    }
    state.exams.push({ id: makeId(), title, courseId: data.courseId, examDate: data.date, difficulty: Number(data.level || 2), scope: content, sourceName: "AI 导入" });
  }

  els.aiImportStatus.textContent = "已保存";
  els.aiImportDraft.innerHTML = '<div class="summary-text">已保存到系统，计划、复习模式和搜索都会自动使用这份资料。</div>';
  els.aiImportInput.value = "";
  persistAndRender();
}

function renderAiList(items) {
  return items.length
    ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
    : '<p class="empty-state">暂无</p>';
}

function typeLabel(type) {
  return { lesson: "课次内容", task: "作业 / CW", research: "科研任务", exam: "考试范围", note: "课堂笔记" }[type] || "未知";
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("\n", " ");
}

function deadlineTime(value) {
  const date = new Date(`${value || ""}T00:00:00`);
  const time = date.getTime();
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function getDeadlineValue(item) {
  return item.deadlineDate || item.dueDate || item.examDate || item.date || "";
}

function compareTasksByDeadline(a, b) {
  const dateDiff = deadlineTime(getDeadlineValue(a)) - deadlineTime(getDeadlineValue(b));
  if (dateDiff) return dateDiff;
  const scoreDiff = (b.score || 0) - (a.score || 0);
  if (scoreDiff) return scoreDiff;
  return String(a.title || "").localeCompare(String(b.title || ""), "zh-CN");
}

function getPriorityItems() {
  const taskItems = state.tasks.filter((task) => !task.completed).map((task) => {
    const daysLeft = daysUntil(task.dueDate);
    return {
      id: task.id,
      sourceId: `task:${task.id}`,
      type: "DDL",
      title: task.title,
      course: getCourseName(task.courseId),
      daysLeft,
      deadlineDate: task.dueDate,
      deadlineText: dueLabel(task.dueDate),
      score: scoreTask(task),
      hours: task.hours,
      details: task.details,
      reason: buildTaskReason(task, daysLeft),
    };
  });

  const researchItems = state.research.filter((item) => !item.completed).map((item) => {
    const daysLeft = daysUntil(item.dueDate);
    return {
      id: item.id,
      sourceId: `research:${item.id}`,
      type: "科研",
      title: item.title,
      course: item.project || "科研任务",
      daysLeft,
      deadlineDate: item.dueDate,
      deadlineText: dueLabel(item.dueDate),
      score: scoreResearch(item),
      hours: item.hours,
      details: item.details,
      reason: buildResearchReason(item, daysLeft),
    };
  });

  const examItems = state.exams.map((exam) => {
    const daysLeft = daysUntil(exam.examDate);
    return {
      id: exam.id,
      sourceId: `exam:${exam.id}`,
      type: "考试",
      title: exam.title,
      course: getCourseName(exam.courseId),
      daysLeft,
      deadlineDate: exam.examDate,
      deadlineText: dueLabel(exam.examDate),
      score: scoreExam(exam),
      hours: Math.max(6, exam.difficulty * 5),
      details: exam.scope,
      reason: buildExamReason(exam, daysLeft),
    };
  });

  const lessonItems = state.lessons.map((lesson) => {
    const age = lesson.date ? Math.max(0, -daysUntil(lesson.date)) : 14;
    const score = Math.max(18, 55 - age * 2);
    return {
      id: lesson.id,
      sourceId: `lesson:${lesson.id}`,
      type: "课次复习",
      title: lesson.title,
      course: getCourseName(lesson.courseId),
      daysLeft: 14,
      deadlineDate: "",
      deadlineText: "建议复习",
      score,
      hours: 1,
      details: lesson.content,
      reason: "根据已导入的课堂内容安排回顾",
    };
  });

  return [...taskItems, ...researchItems, ...examItems, ...lessonItems]
    .filter((item) => item.daysLeft >= 0)
    .sort(compareTasksByDeadline);
}

function generatePlan(dayCount) {
  const plan = Array.from({ length: dayCount }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    return { date, items: [] };
  });

  const items = getPriorityItems();
  items.forEach((item) => {
    const boost = Number(state.rescheduleBoosts[item.sourceId] || 0);
    const offset = planOffsetDays(item.sourceId);
    const availableDays = Math.max(1, Math.min(dayCount, item.daysLeft + 1));
    const sessions = Math.max(1, Math.min(availableDays, Math.ceil(item.hours / 2) + boost));
    const stepTitles = splitIntoSteps(item, sessions);

    for (let i = 0; i < sessions; i += 1) {
      const baseIndex = Math.max(boost > 0 && offset > 0 ? 1 : 0, Math.floor((i * availableDays) / sessions));
      const targetIndex = Math.min(dayCount - 1, baseIndex + offset);
      if (baseIndex + offset >= dayCount) continue;
      const key = `${item.sourceId}:${i}`;
      plan[targetIndex].items.push({
        key,
        sourceId: item.sourceId,
        title: stepTitles[i],
        subtitle: `${item.course} · ${item.deadlineText} · ${item.reason}`,
        deadlineDate: item.deadlineDate,
        score: item.score + boost * 12,
      });
    }
  });

  plan.forEach((day) => {
    day.items.sort(compareTasksByDeadline);
    day.items = day.items.slice(0, 5);
  });

  return plan;
}

function planOffsetDays(sourceId) {
  const value = state.planOffsets?.[sourceId];
  if (!value) return 0;
  if (typeof value === "number") return Math.max(0, value);
  return Math.max(0, daysUntil(value));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function splitIntoSteps(item, sessions) {
  const steps = [];
  const detail = item.details || "";
  const fragments = detail
    .split(/[；;。.\n、,，]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, sessions);

  for (let index = 0; index < sessions; index += 1) {
    if (item.type === "考试") {
      const topic = fragments[index] ? `：${fragments[index]}` : "";
      steps.push(`复习 ${item.title}${topic}`);
    } else if (item.type === "课次复习") {
      const topic = fragments[index] ? `：${fragments[index]}` : "";
      steps.push(`回顾 ${item.title}${topic}`);
    } else if (item.type === "笔记复习") {
      const topic = fragments[index] ? `：${fragments[index]}` : "";
      steps.push(`复习笔记 ${item.title}${topic}`);
    } else {
      const part = fragments[index] ? `：${fragments[index]}` : ` 第 ${index + 1} 部分`;
      steps.push(`推进 ${item.title}${part}`);
    }
  }
  return steps;
}

function scoreTask(task) {
  const days = Math.max(0, daysUntil(task.dueDate));
  const urgency = 80 / (days + 1);
  const workload = Math.min(30, task.hours * 1.4);
  return urgency + workload + task.weight * 18;
}

function scoreResearch(item) {
  const days = Math.max(0, daysUntil(item.dueDate));
  const urgency = 88 / (days + 1);
  const workload = Math.min(36, item.hours * 1.35);
  const kindBoost = item.kind === "paper" ? 12 : item.kind === "meeting" ? 8 : 4;
  return urgency + workload + item.weight * 17 + kindBoost;
}

function scoreExam(exam) {
  const days = Math.max(0, daysUntil(exam.examDate));
  const urgency = 95 / (days + 1);
  return urgency + exam.difficulty * 24;
}

function buildTaskReason(task, daysLeft) {
  if (daysLeft <= 1) return "时间非常紧，今天必须优先处理";
  if (daysLeft <= 4) return "DDL 接近，建议拆分推进";
  if (task.hours >= 10) return "预计耗时较长，需要提前分配时间";
  return "按重要程度和截止日期排入计划";
}

function buildResearchReason(item, daysLeft) {
  if (daysLeft <= 1) return "科研截止很近，今天需要优先推进";
  if (item.kind === "meeting") return "组会/汇报需要提前准备材料";
  if (item.kind === "paper") return "论文任务通常需要分阶段完成";
  if (item.hours >= 10) return "预计耗时较长，需要拆分推进";
  return "按科研截止日期和工作量排入计划";
}

function buildExamReason(exam, daysLeft) {
  if (daysLeft <= 3) return "考试临近，优先回顾范围和题型";
  if (exam.difficulty >= 3) return "难度较高，建议持续复习";
  return "按考试时间安排复习节奏";
}

function nextReviewDate(reviewCount, fromDate = "", difficulty = "normal") {
  const intervalMap = {
    easy: [5, 10, 21, 45, 60],
    normal: [3, 7, 14, 30, 45],
    hard: [1, 3, 7, 14, 30],
  };
  const intervals = intervalMap[difficulty] || intervalMap.normal;
  const days = intervals[Math.min(Number(reviewCount || 0), intervals.length - 1)];
  const base = fromDate ? new Date(fromDate) : new Date();
  if (Number.isNaN(base.getTime())) base.setTime(Date.now());
  base.setDate(base.getDate() + days);
  return formatDate(base);
}

function noteReviewReason(note) {
  const count = Number(note.reviewCount || 0);
  if (!count) return "因为这份笔记还没复习过";
  const days = daysUntil(note.nextReviewDate || nextReviewDate(count, note.date, note.difficulty));
  if (days <= 0) return "因为这份笔记到复习日了";
  return `因为这份笔记已复习 ${count} 次，按间隔复习安排`;
}

function noteDifficultyLabel(value) {
  return { easy: "简单", normal: "普通", hard: "难" }[value] || "普通";
}

function calendarDeadlineReason(dateString, weight) {
  const days = daysUntil(dateString);
  if (days === 0) return "因为今天截止";
  if (days > 0 && days <= 3) return `因为 ${days} 天后 DDL`;
  if (Number(weight || 0) >= 3) return "因为重要程度高";
  return "因为截止日期已进入日历";
}

function calendarExamReason(dateString, difficulty) {
  const days = daysUntil(dateString);
  if (days === 0) return "因为今天考试";
  if (days > 0 && days <= 7) return `因为考试临近（${days} 天后）`;
  if (Number(difficulty || 0) >= 3) return "因为考试难度高，需要提前复习";
  return "因为考试日期已进入日历";
}

function createSummary(priorityItems, urgent) {
  if (!priorityItems.length) {
    return "你还没有录入足够的信息。建议先添加本学期课程、每门课的 CW/DDL、大作业、考试时间和考试范围。";
  }

  const first = priorityItems[0];
  const exams = priorityItems.filter((item) => item.type === "考试").slice(0, 2);
  const tasks = priorityItems.filter((item) => item.type === "DDL").slice(0, 2);
  const lines = [
    `当前最应该优先处理的是「${first.title}」，因为${first.reason}。`,
    urgent.length ? `未来 7 天有 ${urgent.length} 个任务接近 DDL，需要每天留出固定时间推进。` : "未来 7 天暂时没有特别紧急的 DDL，可以把时间更多放在复习和长期项目上。",
  ];

  if (exams.length) lines.push(`复习重点：${exams.map((item) => item.course).join("、")}。`);
  if (tasks.length) lines.push(`任务重点：${tasks.map((item) => item.title).join("、")}。`);
  lines.push("建议每天先完成最高优先级任务，再做课程复习，最后整理笔记和检查明天安排。");
  return lines.join("\n");
}

function removeCourse(id) {
  state.courses = state.courses.filter((course) => course.id !== id);
  state.tasks = state.tasks.filter((task) => task.courseId !== id);
  state.exams = state.exams.filter((exam) => exam.courseId !== id);
  persistAndRender();
}

function removeTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  persistAndRender();
}

function editTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  els.taskForm.elements.id.value = task.id;
  els.taskForm.elements.title.value = task.title || "";
  els.taskForm.elements.courseId.value = task.courseId || "";
  els.taskForm.elements.dueDate.value = task.dueDate || "";
  els.taskForm.elements.hours.value = task.hours || 1;
  els.taskForm.elements.weight.value = task.weight || 2;
  els.taskForm.elements.details.value = task.details || "";
  els.taskFormTitle.textContent = "编辑任务 / CW / 大作业";
  els.taskSubmitButton.textContent = "保存修改";
  els.cancelTaskEdit.hidden = false;
  switchView("tasks");
  els.taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetTaskForm() {
  els.taskForm.reset();
  els.taskForm.elements.id.value = "";
  els.taskFormTitle.textContent = "添加任务 / CW / 大作业";
  els.taskSubmitButton.textContent = "添加任务";
  els.cancelTaskEdit.hidden = true;
}

function removeResearch(id) {
  state.research = state.research.filter((item) => item.id !== id);
  persistAndRender();
}

function toggleResearch(id) {
  state.research = state.research.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item));
  persistAndRender();
}

function removeLesson(id) {
  state.lessons = state.lessons.filter((lesson) => lesson.id !== id);
  persistAndRender();
}

function removeNote(id) {
  state.notes = state.notes.filter((note) => note.id !== id);
  persistAndRender();
}

function markNoteReviewed(id) {
  state.notes = state.notes.map((note) => {
    if (note.id !== id) return note;
    const reviewCount = Number(note.reviewCount || 0) + 1;
    return {
      ...note,
      reviewCount,
      lastReviewedAt: new Date().toISOString(),
      nextReviewDate: nextReviewDate(reviewCount, "", note.difficulty),
    };
  });
  persistAndRender();
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task));
  persistAndRender();
}

function getPlanStatus(key) {
  return state.progress?.[key] || "todo";
}

function setPlanStatus(key, status) {
  state.progress = state.progress || {};
  state.progress[key] = status;
  persistAndRender();
}

function delayPlanItem(key, sourceId) {
  state.progress = state.progress || {};
  state.rescheduleBoosts = state.rescheduleBoosts || {};
  state.planOffsets = state.planOffsets || {};
  state.progress[key] = "delayed";
  state.rescheduleBoosts[sourceId] = Math.min(4, Number(state.rescheduleBoosts[sourceId] || 0) + 1);
  state.planOffsets[sourceId] = formatDate(addDays(new Date(), 1));
  persistAndRender();
}

function postponePlanItem(key, sourceId, days) {
  state.progress = state.progress || {};
  state.planOffsets = state.planOffsets || {};
  state.progress[key] = "delayed";
  state.planOffsets[sourceId] = formatDate(addDays(new Date(), Number(days || 1)));
  persistAndRender();
}

function rescheduleTodayUnfinished() {
  const todayItems = generatePlan(1)[0]?.items || [];
  const unfinished = todayItems.filter((item) => !["done", "skipped", "delayed"].includes(getPlanStatus(item.key)));
  if (!unfinished.length) {
    alert("今天没有需要重排的未完成任务。");
    return;
  }

  if (!confirm(`今天有 ${unfinished.length} 个任务未完成，要自动延期并重新安排吗？`)) return;
  state.progress = state.progress || {};
  state.rescheduleBoosts = state.rescheduleBoosts || {};
  state.planOffsets = state.planOffsets || {};
  unfinished.forEach((item) => {
    state.progress[item.key] = "delayed";
    state.rescheduleBoosts[item.sourceId] = Math.min(4, Number(state.rescheduleBoosts[item.sourceId] || 0) + 1);
    state.planOffsets[item.sourceId] = formatDate(addDays(new Date(), 1));
  });
  persistAndRender();
}

async function extractImportFile() {
  const file = els.importFile.files[0];
  if (!file) {
    alert("请先选择一个 PDF 或 TXT 文件。");
    return;
  }

  els.importPreview.textContent = "正在读取文件...";
  try {
    const text = await extractTextFromFile(file);
    els.importText.value = text.trim();
    els.importPreview.textContent = els.importText.value || "文件里没有读取到文字。";
    autofillImportForm();
  } catch (error) {
    els.importPreview.textContent = `读取失败：${error.message}`;
  }
}

async function extractNoteFile() {
  const file = els.noteFile.files[0];
  if (!file) {
    alert("请先选择一个 PDF、DOCX 或 TXT 笔记文件。");
    return;
  }

  els.noteContent.value = "正在读取笔记文件...";
  try {
    const text = await extractTextFromFile(file);
    els.noteContent.value = text || "文件里没有读取到文字。";
  } catch (error) {
    els.noteContent.value = `读取失败：${error.message}`;
  }
}

async function extractTextFromFile(file) {
  const lowerName = file.name.toLowerCase();
  if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
    if (!shouldUseBackend()) throw new Error("PDF 提取需要启动 SQLite 后端。");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/extract-pdf", { method: "POST", body: formData });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    return (result.text || "").trim();
  }

  if (lowerName.endsWith(".docx")) {
    if (!shouldUseBackend()) throw new Error("Word 笔记提取需要启动 SQLite 后端。");
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/extract-docx", { method: "POST", body: formData });
    if (!response.ok) throw new Error(await response.text());
    const result = await response.json();
    return (result.text || "").trim();
  }

  return (await file.text()).trim();
}

function autofillImportForm() {
  const form = els.importForm;
  const text = `${els.importText.value || ""}\n${els.importFile.files[0]?.name || ""}`.trim();
  if (!text) return;

  const inferredCourseId = inferCourseId(text);
  if (inferredCourseId) form.elements.courseId.value = inferredCourseId;

  const inferredDate = inferDate(text);
  if (inferredDate && !form.elements.date.value) form.elements.date.value = inferredDate;

  if (!form.elements.title.value.trim()) {
    form.elements.title.value = inferTitle(text, els.importFile.files[0]?.name, form.elements.kind.value);
  }
}

function inferCourseId(text) {
  const normalized = normalizeText(text);
  return state.courses.find((course) => {
    const tokens = [course.name, course.meta].filter(Boolean).map(normalizeText);
    return tokens.some((token) => token && normalized.includes(token));
  })?.id || "";
}

function inferDate(text) {
  const normalized = String(text).replace(/[./]/g, "-");
  const match = normalized.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (!match) return "";
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

function inferTitle(text, fileName, kind) {
  const fromFile = fileName ? fileName.replace(/\.[^.]+$/, "").trim() : "";
  if (fromFile) return fromFile;
  const firstLine = String(text).split(/\r?\n/).map((line) => line.trim()).find(Boolean);
  if (firstLine) return trimLongText(firstLine, 40);
  return { lesson: "课程内容", note: "课堂笔记", task: "课程任务", research: "科研任务", exam: "考试范围" }[kind] || "导入资料";
}

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/\s+/g, "");
}

function importNoteDifficulty(level) {
  return { 1: "easy", 2: "normal", 3: "hard" }[Number(level || 2)] || "normal";
}

function renderImportResult(info, title) {
  if (!info) return "导入成功。";
  return `
    <div class="import-result">
      <strong>导入成功</strong>
      ${renderField("已保存为", info.type)}
      ${renderField("标题", title)}
      ${renderField("所属课程", info.course || "未绑定课程")}
      ${renderField("会出现在", info.appears)}
    </div>
  `;
}

function isDuplicateRecord(collection, candidate) {
  const source = candidate.sourceName || candidate.fileName || "";
  const contentKey = normalizeText(candidate.content || candidate.details || candidate.scope || "");
  return (state[collection] || []).some((item) => {
    const sameCourse = (item.courseId || item.project || "") === (candidate.courseId || candidate.project || "");
    const sameSource = source && source === (item.sourceName || item.fileName || "");
    const sameTitle = normalizeText(item.title) === normalizeText(candidate.title);
    const itemContent = normalizeText(item.content || item.details || item.scope || "");
    return sameCourse && ((sameSource && sameTitle) || (contentKey && contentKey === itemContent));
  });
}

function importInformation(event) {
  event.preventDefault();
  autofillImportForm();
  const data = Object.fromEntries(new FormData(event.target));
  const content = (data.text || "").trim();
  const sourceName = els.importFile.files[0]?.name || "纯文本输入";
  const title = data.title.trim() || inferTitle(content, els.importFile.files[0]?.name, data.kind);
  const courseId = data.courseId || inferCourseId(content);
  let savedInfo = null;

  if (!content) {
    alert("请先粘贴文本，或者上传文件并读取内容。");
    return;
  }

  if (!["lesson", "note"].includes(data.kind) && !data.date) {
    alert("作业/CW 需要填写 DDL，考试需要填写考试时间。");
    return;
  }

  if (data.kind === "lesson") {
    const record = {
      id: makeId(),
      title,
      courseId,
      date: data.date,
      content,
      sourceName,
    };
    if (isDuplicateRecord("lessons", record)) return alert("这份课程内容已经导入过了，已跳过重复保存。");
    state.lessons.push(record);
    savedInfo = { type: "课次内容", course: getCourseName(courseId), appears: "日历复习、资料搜索" };
  }

  if (data.kind === "note") {
    const record = {
      id: makeId(),
      title,
      courseId,
      date: data.date,
      fileName: sourceName,
      content,
      createdAt: new Date().toISOString(),
      difficulty: importNoteDifficulty(data.level),
      reviewCount: 0,
      nextReviewDate: nextReviewDate(0, data.date, importNoteDifficulty(data.level)),
    };
    if (isDuplicateRecord("notes", record)) return alert("这份课堂笔记已经导入过了，已跳过重复保存。");
    state.notes.push(record);
    savedInfo = { type: "课堂笔记", course: getCourseName(courseId), appears: "资料搜索、日历、笔记复习" };
  }

  if (data.kind === "task") {
    const record = {
      id: makeId(),
      title,
      courseId,
      dueDate: data.date,
      hours: Number(data.hours || 3),
      weight: Number(data.level || 2),
      details: content,
      completed: false,
      sourceName,
    };
    if (isDuplicateRecord("tasks", record)) return alert("这份任务资料已经导入过了，已跳过重复保存。");
    state.tasks.push(record);
    savedInfo = { type: "DDL 任务", course: getCourseName(courseId), appears: "日历、三天内 DDL、今日安排" };
  }

  if (data.kind === "research") {
    const record = {
      id: makeId(),
      title,
      project: getCourseName(courseId) === "未绑定课程" ? "科研任务" : getCourseName(courseId),
      kind: "other",
      dueDate: data.date,
      hours: Number(data.hours || 3),
      weight: Number(data.level || 2),
      details: content,
      completed: false,
      sourceName,
    };
    if (isDuplicateRecord("research", record)) return alert("这份科研资料已经导入过了，已跳过重复保存。");
    state.research.push(record);
    savedInfo = { type: "科研任务", course: record.project, appears: "日历、三天内 DDL、今日安排" };
  }

  if (data.kind === "exam") {
    const record = {
      id: makeId(),
      title,
      courseId,
      examDate: data.date,
      difficulty: Number(data.level || 2),
      scope: content,
      sourceName,
    };
    if (isDuplicateRecord("exams", record)) return alert("这份考试资料已经导入过了，已跳过重复保存。");
    state.exams.push(record);
    savedInfo = { type: "考试范围", course: getCourseName(courseId), appears: "日历、考试复习、资料搜索" };
  }

  event.target.reset();
  els.importPreview.innerHTML = renderImportResult(savedInfo, title);
  updateImportLabels();
  persistAndRender();
}

function updateImportLabels() {
  const kind = els.importKind.value;
  const dateLabel = document.querySelector("#importDateLabel");
  const hoursLabel = document.querySelector("#importHoursLabel");
  const levelLabel = document.querySelector("#importLevelLabel");

  dateLabel.firstChild.textContent = kind === "lesson" ? "上课日期" : kind === "note" ? "笔记日期" : kind === "task" ? "DDL" : kind === "research" ? "截止日期 / 组会日期" : "考试时间";
  hoursLabel.style.display = kind === "exam" ? "none" : "grid";
  levelLabel.firstChild.textContent = kind === "exam" ? "考试难度" : kind === "note" ? "笔记难度" : "重要程度";
}

function removeExam(id) {
  state.exams = state.exams.filter((exam) => exam.id !== id);
  persistAndRender();
}

function editCourse(id) {
  const course = state.courses.find((item) => item.id === id);
  if (!course) return;
  els.courseForm.elements.id.value = course.id;
  els.courseForm.elements.name.value = course.name || "";
  els.courseForm.elements.meta.value = course.meta || "";
  els.courseForm.elements.schedule.value = course.schedule || "";
  els.courseForm.elements.goal.value = course.goal || "";
  els.courseFormTitle.textContent = "编辑课程";
  els.courseSubmitButton.textContent = "保存课程";
  els.cancelCourseEdit.hidden = false;
  els.courseForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetCourseForm() {
  els.courseForm.reset();
  els.courseForm.elements.id.value = "";
  els.courseFormTitle.textContent = "添加课程";
  els.courseSubmitButton.textContent = "添加课程";
  els.cancelCourseEdit.hidden = true;
}

function editNote(id) {
  const note = state.notes.find((item) => item.id === id);
  if (!note) return;
  els.noteForm.elements.id.value = note.id;
  els.noteForm.elements.title.value = note.title || "";
  els.noteForm.elements.courseId.value = note.courseId || "";
  els.noteForm.elements.date.value = note.date || "";
  els.noteForm.elements.difficulty.value = note.difficulty || "normal";
  els.noteContent.value = note.content || "";
  els.noteFile.required = false;
  els.noteFormTitle.textContent = "编辑课堂笔记";
  els.noteSubmitButton.textContent = "保存笔记";
  els.cancelNoteEdit.hidden = false;
  els.noteForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetNoteForm() {
  els.noteForm.reset();
  els.noteForm.elements.id.value = "";
  els.noteContent.value = "";
  els.noteFile.required = true;
  els.noteFormTitle.textContent = "上传课堂笔记";
  els.noteSubmitButton.textContent = "保存到笔记库";
  els.cancelNoteEdit.hidden = true;
}

function editExam(id) {
  const exam = state.exams.find((item) => item.id === id);
  if (!exam) return;
  els.examForm.elements.id.value = exam.id;
  els.examForm.elements.title.value = exam.title || "";
  els.examForm.elements.courseId.value = exam.courseId || "";
  els.examForm.elements.examDate.value = exam.examDate || "";
  els.examForm.elements.difficulty.value = String(exam.difficulty || 2);
  els.examForm.elements.scope.value = exam.scope || "";
  els.examFormTitle.textContent = "编辑考试";
  els.examSubmitButton.textContent = "保存考试";
  els.cancelExamEdit.hidden = false;
  els.examForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetExamForm() {
  els.examForm.reset();
  els.examForm.elements.id.value = "";
  els.examFormTitle.textContent = "添加考试";
  els.examSubmitButton.textContent = "添加考试";
  els.cancelExamEdit.hidden = true;
}

async function persistAndRender() {
  await saveState();
  render();
}

function exportState() {
  const content = JSON.stringify(normalizeState(state), null, 2);
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `study-planner-backup-${formatDate(new Date())}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function importStateFromFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const imported = normalizeState(JSON.parse(text));
    if (!confirm("导入后会替换当前所有本地数据，确定继续吗？")) return;
    state = imported;
    taskFilters = { status: "all", courseId: "all" };
    await persistAndRender();
    alert("导入完成。");
  } catch (error) {
    alert(`导入失败：${error.message}`);
  } finally {
    event.target.value = "";
  }
}

async function loadState() {
  if (shouldUseBackend()) {
    try {
      const response = await fetch("/api/state");
      if (response.ok) return normalizeState(await response.json());
    } catch {
      console.warn("后端不可用，已切换到浏览器本地存储。");
    }
  }

  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY)) || EMPTY_STATE);
  } catch {
    return { ...EMPTY_STATE };
  }
}

async function saveState() {
  if (shouldUseBackend()) {
    try {
      const response = await fetch("/api/state", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (response.ok) return;
    } catch {
      console.warn("保存到后端失败，已保存到浏览器本地存储。");
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function normalizeState(value) {
  return {
    courses: Array.isArray(value?.courses) ? value.courses : [],
    tasks: Array.isArray(value?.tasks) ? value.tasks : [],
    research: Array.isArray(value?.research) ? value.research : [],
    exams: Array.isArray(value?.exams) ? value.exams : [],
    lessons: Array.isArray(value?.lessons) ? value.lessons : [],
    notes: Array.isArray(value?.notes)
      ? value.notes.map((note) => ({
          ...note,
          difficulty: note.difficulty || "normal",
          reviewCount: Number(note.reviewCount || 0),
          nextReviewDate: note.nextReviewDate || nextReviewDate(Number(note.reviewCount || 0), note.date, note.difficulty || "normal"),
        }))
      : [],
    progress: value?.progress && typeof value.progress === "object" ? value.progress : {},
    rescheduleBoosts: value?.rescheduleBoosts && typeof value.rescheduleBoosts === "object" ? value.rescheduleBoosts : {},
    planOffsets: value?.planOffsets && typeof value.planOffsets === "object" ? value.planOffsets : {},
  };
}

function shouldUseBackend() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

function createDemoData() {
  const today = new Date();
  const dateAfter = (days) => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const courses = [
    {
      id: makeId(),
      name: "数据库系统",
      meta: "李老师 / B302",
      schedule: "周二 10:00-11:40；周四 14:00-15:40",
      goal: "掌握 SQL、范式、事务、索引，完成课程项目。",
    },
    {
      id: makeId(),
      name: "数据结构",
      meta: "王老师 / A201",
      schedule: "周一 9:00-10:40；周三 9:00-10:40",
      goal: "复习树、图、排序、查找和算法复杂度。",
    },
    {
      id: makeId(),
      name: "学术英语",
      meta: "陈老师 / C105",
      schedule: "周五 13:30-15:10",
      goal: "完成 presentation 和 research report。",
    },
  ];
  return {
    courses,
    tasks: [
      {
        id: makeId(),
        title: "数据库 CW 项目设计",
        courseId: courses[0].id,
        dueDate: dateAfter(8),
        hours: 14,
        weight: 3,
        details: "ER 图；表结构设计；SQL 查询；项目报告；演示准备",
        completed: false,
      },
      {
        id: makeId(),
        title: "数据结构实验三",
        courseId: courses[1].id,
        dueDate: dateAfter(4),
        hours: 6,
        weight: 2,
        details: "图的遍历；最短路径；代码注释；实验报告",
        completed: false,
      },
      {
        id: makeId(),
        title: "英语 Presentation",
        courseId: courses[2].id,
        dueDate: dateAfter(11),
        hours: 5,
        weight: 2,
        details: "确定主题；制作 slides；写讲稿；练习 3 遍",
        completed: false,
      },
    ],
    research: [
      {
        id: makeId(),
        title: "组会汇报 slides",
        project: "NLP 毕设",
        kind: "meeting",
        dueDate: dateAfter(6),
        hours: 8,
        weight: 3,
        details: "整理本周实验结果；补充 Related Work；准备 8 页 slides；列出下周计划",
        completed: false,
      },
      {
        id: makeId(),
        title: "论文初稿 Related Work",
        project: "论文投稿",
        kind: "paper",
        dueDate: dateAfter(16),
        hours: 18,
        weight: 3,
        details: "阅读 5 篇相关论文；整理方法对比表；完成 Related Work 初稿；检查引用格式",
        completed: false,
      },
    ],
    lessons: [
      {
        id: makeId(),
        title: "数据库 Week 3：关系模型与 SQL",
        courseId: courses[0].id,
        date: dateAfter(-7),
        content: "关系模型；主键和外键；基础 SQL 查询；WHERE 条件；JOIN 的使用",
        sourceName: "示例文本",
      },
      {
        id: makeId(),
        title: "数据结构 Week 4：树和二叉树",
        courseId: courses[1].id,
        date: dateAfter(-4),
        content: "二叉树遍历；递归实现；二叉搜索树；平衡树概念；课堂例题",
        sourceName: "示例文本",
      },
    ],
    notes: [
      {
        id: makeId(),
        title: "数据库 Week 3 课堂笔记",
        courseId: courses[0].id,
        date: dateAfter(-7),
        fileName: "database-week3.pdf",
        content: "SQL 查询的执行顺序；JOIN 需要注意连接条件；范式题要先找函数依赖；老师强调期末会考关系代数。",
        createdAt: new Date().toISOString(),
      },
    ],
    exams: [
      {
        id: makeId(),
        title: "数据结构期末",
        courseId: courses[1].id,
        examDate: dateAfter(18),
        difficulty: 3,
        scope: "复杂度分析；栈和队列；树；图；排序；查找；历年题",
      },
      {
        id: makeId(),
        title: "数据库期末",
        courseId: courses[0].id,
        examDate: dateAfter(24),
        difficulty: 2,
        scope: "关系模型；SQL；范式；事务；索引；恢复与并发控制",
      },
    ],
  };
}

function getCourseName(id) {
  return state.courses.find((course) => course.id === id)?.name || "未绑定课程";
}

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateString);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function dueLabel(dateString) {
  const days = daysUntil(dateString);
  if (days < 0) return "已过期";
  if (days === 0) return "今天截止";
  if (days === 1) return "明天截止";
  return `${days} 天后`;
}

function urgencyClass(days) {
  if (days <= 2) return "high";
  if (days <= 7) return "medium";
  return "low";
}

function difficultyText(value) {
  return { 1: "低", 2: "中", 3: "高" }[value] || "中";
}

function researchKindLabel(kind) {
  return {
    meeting: "组会 / 汇报",
    paper: "论文 / 投稿",
    experiment: "实验 / 数据",
    reading: "文献阅读",
    other: "其他科研",
  }[kind] || "科研任务";
}

function weekday(date) {
  return ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][date.getDay()];
}

function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderField(label, value) {
  return `
    <dl class="field-readout">
      <dt>${escapeHtml(label)}</dt>
      <dd>${escapeHtml(value)}</dd>
    </dl>
  `;
}

function trimLongText(value, maxLength) {
  const text = String(value);
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function makeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

window.removeCourse = removeCourse;
window.editCourse = editCourse;
window.removeTask = removeTask;
window.removeResearch = removeResearch;
window.removeLesson = removeLesson;
window.removeNote = removeNote;
window.editNote = editNote;
window.markNoteReviewed = markNoteReviewed;
window.toggleTask = toggleTask;
window.toggleResearch = toggleResearch;
window.setPlanStatus = setPlanStatus;
window.delayPlanItem = delayPlanItem;
window.removeExam = removeExam;
window.editExam = editExam;
window.showCalendarEventDetail = showCalendarEventDetail;
window.closeCalendarEventDetail = closeCalendarEventDetail;
