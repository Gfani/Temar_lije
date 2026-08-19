--
-- PostgreSQL database dump
--

\restrict N2ZPtVYeuUifnGRH7iihWqYQX9DxZagLIM6FLvMUMWgv2r1JGIWQS2pHEl9kB5P

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

-- Started on 2026-08-18 13:23:18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 5 (class 2615 OID 115040)
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- TOC entry 5112 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- TOC entry 859 (class 1247 OID 115051)
-- Name: attendance_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.attendance_status AS ENUM (
    'PRESENT',
    'ABSENT',
    'LATE',
    'EXCUSED'
);


ALTER TYPE public.attendance_status OWNER TO postgres;

--
-- TOC entry 862 (class 1247 OID 115060)
-- Name: material_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.material_type AS ENUM (
    'PDF',
    'SLIDES',
    'DOCUMENT',
    'LINK'
);


ALTER TYPE public.material_type OWNER TO postgres;

--
-- TOC entry 865 (class 1247 OID 115070)
-- Name: question_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.question_type AS ENUM (
    'MULTIPLE_CHOICE',
    'TRUE_FALSE',
    'SHORT_ANSWER'
);


ALTER TYPE public.question_type OWNER TO postgres;

--
-- TOC entry 868 (class 1247 OID 115078)
-- Name: sync_action; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.sync_action AS ENUM (
    'CREATE',
    'UPDATE',
    'DELETE'
);


ALTER TYPE public.sync_action OWNER TO postgres;

--
-- TOC entry 871 (class 1247 OID 115086)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'ADMIN',
    'TEACHER',
    'STUDENT'
);


ALTER TYPE public.user_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 215 (class 1259 OID 115041)
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- TOC entry 216 (class 1259 OID 115093)
-- Name: assignment_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignment_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    assignment_id uuid NOT NULL,
    student_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    is_latest boolean DEFAULT true NOT NULL,
    submission_text text,
    file_url text,
    grade numeric(5,2),
    feedback text,
    submitted_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.assignment_submissions OWNER TO postgres;

--
-- TOC entry 217 (class 1259 OID 115104)
-- Name: assignments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.assignments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(250) NOT NULL,
    description text,
    due_date timestamp(6) with time zone,
    total_points integer DEFAULT 100 NOT NULL,
    classroom_id uuid NOT NULL,
    created_by_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


ALTER TABLE public.assignments OWNER TO postgres;

--
-- TOC entry 218 (class 1259 OID 115115)
-- Name: attendance_records; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    student_id uuid NOT NULL,
    status public.attendance_status DEFAULT 'PRESENT'::public.attendance_status NOT NULL,
    checked_in_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.attendance_records OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 115123)
-- Name: attendance_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.attendance_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    session_code character varying(6),
    is_active boolean DEFAULT true NOT NULL,
    started_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    ended_at timestamp(6) with time zone
);


ALTER TABLE public.attendance_sessions OWNER TO postgres;

--
-- TOC entry 220 (class 1259 OID 115131)
-- Name: chat_messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    classroom_id uuid,
    study_group_id uuid,
    content text NOT NULL,
    attachments jsonb,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.chat_messages OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 115140)
-- Name: classroom_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.classroom_members OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 115147)
-- Name: classroom_teachers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_teachers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    classroom_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_owner boolean DEFAULT false NOT NULL,
    added_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.classroom_teachers OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 115155)
-- Name: classrooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classrooms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(200) NOT NULL,
    subject character varying(100),
    description text,
    invite_code character varying(6) NOT NULL,
    created_by_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


ALTER TABLE public.classrooms OWNER TO postgres;

--
-- TOC entry 224 (class 1259 OID 115165)
-- Name: materials; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.materials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(250) NOT NULL,
    file_url text NOT NULL,
    file_type public.material_type DEFAULT 'PDF'::public.material_type NOT NULL,
    file_size_bytes bigint,
    is_vectorized boolean DEFAULT false NOT NULL,
    classroom_id uuid NOT NULL,
    uploaded_by_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


ALTER TABLE public.materials OWNER TO postgres;

--
-- TOC entry 225 (class 1259 OID 115177)
-- Name: quiz_questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_questions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type public.question_type DEFAULT 'MULTIPLE_CHOICE'::public.question_type NOT NULL,
    options jsonb,
    correct_answer text NOT NULL,
    points integer DEFAULT 1 NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.quiz_questions OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 115188)
-- Name: quiz_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quiz_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    quiz_id uuid NOT NULL,
    student_id uuid NOT NULL,
    attempt_number integer DEFAULT 1 NOT NULL,
    is_latest boolean DEFAULT true NOT NULL,
    score numeric(5,2),
    answers jsonb NOT NULL,
    submitted_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.quiz_submissions OWNER TO postgres;

--
-- TOC entry 227 (class 1259 OID 115199)
-- Name: quizzes; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quizzes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(250) NOT NULL,
    description text,
    duration_minutes integer DEFAULT 30 NOT NULL,
    is_published boolean DEFAULT false NOT NULL,
    classroom_id uuid NOT NULL,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


ALTER TABLE public.quizzes OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 115211)
-- Name: study_group_members; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.study_group_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    study_group_id uuid NOT NULL,
    user_id uuid NOT NULL,
    joined_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.study_group_members OWNER TO postgres;

--
-- TOC entry 229 (class 1259 OID 115218)
-- Name: study_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.study_groups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    classroom_id uuid NOT NULL,
    created_by_id uuid NOT NULL,
    icon character varying(50),
    color_accent character varying(20),
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.study_groups OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 115225)
-- Name: sync_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    device_hub_id character varying(100) NOT NULL,
    entity_name character varying(100) NOT NULL,
    entity_id uuid NOT NULL,
    action public.sync_action NOT NULL,
    payload jsonb NOT NULL,
    synced_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.sync_logs OWNER TO postgres;

--
-- TOC entry 231 (class 1259 OID 115234)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    full_name character varying(150) NOT NULL,
    role public.user_role DEFAULT 'STUDENT'::public.user_role NOT NULL,
    avatar_url text,
    created_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp(6) with time zone
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 5090 (class 0 OID 115041)
-- Dependencies: 215
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
551a5037-cb87-4c7d-b4fb-cad30392098a	826d3a40d5afa0d3dfde2c4565c5d03341b21baec3172359020fdc7b545e9074	2026-08-18 09:20:51.925233+03	0_init	\N	\N	2026-08-18 09:20:51.712983+03	1
\.


--
-- TOC entry 5091 (class 0 OID 115093)
-- Dependencies: 216
-- Data for Name: assignment_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignment_submissions (id, assignment_id, student_id, attempt_number, is_latest, submission_text, file_url, grade, feedback, submitted_at) FROM stdin;
bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb	aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa	33333333-3333-4333-8333-333333333333	1	t	Here is my widget implementation, see attached file.	https://storage.temarlije.test/submissions/kebede-widget.dart	92.50	Great work! Minor styling improvements possible.	2026-08-18 06:21:14.432+03
\.


--
-- TOC entry 5092 (class 0 OID 115104)
-- Dependencies: 217
-- Data for Name: assignments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.assignments (id, title, description, due_date, total_points, classroom_id, created_by_id, created_at, updated_at, deleted_at) FROM stdin;
aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa	Build a Stateless Widget	Create a simple stateless widget that displays your name and favorite color.	2026-09-01 23:59:00+03	100	66666666-6666-4666-8666-666666666666	11111111-1111-4111-8111-111111111111	2026-08-18 06:21:14.41+03	2026-08-18 06:21:14.41+03	\N
\.


--
-- TOC entry 5093 (class 0 OID 115115)
-- Dependencies: 218
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_records (id, session_id, student_id, status, checked_in_at) FROM stdin;
10101010-1010-4101-8101-101010101010	ffffffff-ffff-4fff-8fff-ffffffffffff	33333333-3333-4333-8333-333333333333	PRESENT	2026-08-18 06:21:14.51+03
\.


--
-- TOC entry 5094 (class 0 OID 115123)
-- Dependencies: 219
-- Data for Name: attendance_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.attendance_sessions (id, classroom_id, session_code, is_active, started_at, ended_at) FROM stdin;
ffffffff-ffff-4fff-8fff-ffffffffffff	66666666-6666-4666-8666-666666666666	CHKIN1	f	2026-08-18 06:21:14.502+03	2026-08-18 06:21:14.498+03
\.


--
-- TOC entry 5095 (class 0 OID 115131)
-- Dependencies: 220
-- Data for Name: chat_messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.chat_messages (id, sender_id, classroom_id, study_group_id, content, attachments, created_at) FROM stdin;
40404040-4040-4404-8404-404040404041	11111111-1111-4111-8111-111111111111	66666666-6666-4666-8666-666666666666	\N	Welcome to Flutter Fundamentals! Check the Materials tab for our first reading.	\N	2026-08-18 06:21:14.572+03
40404040-4040-4404-8404-404040404042	33333333-3333-4333-8333-333333333333	\N	20202020-2020-4202-8202-202020202020	Hey! Anyone want to review widgets together before the quiz?	\N	2026-08-18 06:21:14.58+03
\.


--
-- TOC entry 5096 (class 0 OID 115140)
-- Dependencies: 221
-- Data for Name: classroom_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classroom_members (id, classroom_id, user_id, joined_at) FROM stdin;
88888888-8888-4888-8888-888888888881	66666666-6666-4666-8666-666666666666	33333333-3333-4333-8333-333333333333	2026-08-18 06:21:14.366+03
88888888-8888-4888-8888-888888888882	66666666-6666-4666-8666-666666666666	44444444-4444-4444-8444-444444444444	2026-08-18 06:21:14.375+03
\.


--
-- TOC entry 5097 (class 0 OID 115147)
-- Dependencies: 222
-- Data for Name: classroom_teachers; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classroom_teachers (id, classroom_id, user_id, is_owner, added_at) FROM stdin;
77777777-7777-4777-8777-777777777771	66666666-6666-4666-8666-666666666666	11111111-1111-4111-8111-111111111111	t	2026-08-18 06:21:14.333+03
77777777-7777-4777-8777-777777777772	66666666-6666-4666-8666-666666666666	22222222-2222-4222-8222-222222222222	f	2026-08-18 06:21:14.355+03
\.


--
-- TOC entry 5098 (class 0 OID 115155)
-- Dependencies: 223
-- Data for Name: classrooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classrooms (id, title, subject, description, invite_code, created_by_id, created_at, updated_at, deleted_at) FROM stdin;
66666666-6666-4666-8666-666666666666	Flutter Fundamentals	Mobile Development	Introduction to building cross-platform apps with Flutter.	DB7GLU	11111111-1111-4111-8111-111111111111	2026-08-18 06:21:14.32+03	2026-08-18 06:21:14.32+03	\N
\.


--
-- TOC entry 5099 (class 0 OID 115165)
-- Dependencies: 224
-- Data for Name: materials; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.materials (id, title, file_url, file_type, file_size_bytes, is_vectorized, classroom_id, uploaded_by_id, created_at, updated_at, deleted_at) FROM stdin;
99999999-9999-4999-8999-999999999999	Widget Structure Basics.pdf	https://storage.temarlije.test/materials/widget-structure-basics.pdf	PDF	2450000	t	66666666-6666-4666-8666-666666666666	11111111-1111-4111-8111-111111111111	2026-08-18 06:21:14.382+03	2026-08-18 06:21:14.382+03	\N
\.


--
-- TOC entry 5100 (class 0 OID 115177)
-- Dependencies: 225
-- Data for Name: quiz_questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_questions (id, quiz_id, question_text, question_type, options, correct_answer, points, created_at) FROM stdin;
dddddddd-dddd-4ddd-8ddd-dddddddddddd	cccccccc-cccc-4ccc-8ccc-cccccccccccc	Which widget type rebuilds when its internal state changes?	MULTIPLE_CHOICE	["StatelessWidget", "StatefulWidget", "InheritedWidget", "RenderObject"]	StatefulWidget	10	2026-08-18 06:21:14.474+03
\.


--
-- TOC entry 5101 (class 0 OID 115188)
-- Dependencies: 226
-- Data for Name: quiz_submissions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quiz_submissions (id, quiz_id, student_id, attempt_number, is_latest, score, answers, submitted_at) FROM stdin;
eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee	cccccccc-cccc-4ccc-8ccc-cccccccccccc	33333333-3333-4333-8333-333333333333	1	t	10.00	{"dddddddd-dddd-4ddd-8ddd-dddddddddddd": "StatefulWidget"}	2026-08-18 06:21:14.492+03
\.


--
-- TOC entry 5102 (class 0 OID 115199)
-- Dependencies: 227
-- Data for Name: quizzes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.quizzes (id, title, description, duration_minutes, is_published, classroom_id, created_at, updated_at, deleted_at) FROM stdin;
cccccccc-cccc-4ccc-8ccc-cccccccccccc	Widget Basics Quiz	Quick check on stateless vs stateful widgets.	15	t	66666666-6666-4666-8666-666666666666	2026-08-18 06:21:14.447+03	2026-08-18 06:21:14.447+03	\N
\.


--
-- TOC entry 5103 (class 0 OID 115211)
-- Dependencies: 228
-- Data for Name: study_group_members; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.study_group_members (id, study_group_id, user_id, joined_at) FROM stdin;
30303030-3030-4303-8303-303030303031	20202020-2020-4202-8202-202020202020	33333333-3333-4333-8333-333333333333	2026-08-18 06:21:14.552+03
30303030-3030-4303-8303-303030303032	20202020-2020-4202-8202-202020202020	44444444-4444-4444-8444-444444444444	2026-08-18 06:21:14.563+03
\.


--
-- TOC entry 5104 (class 0 OID 115218)
-- Dependencies: 229
-- Data for Name: study_groups; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.study_groups (id, name, classroom_id, created_by_id, icon, color_accent, created_at) FROM stdin;
20202020-2020-4202-8202-202020202020	Flutter Study Circle	66666666-6666-4666-8666-666666666666	33333333-3333-4333-8333-333333333333	📱	#0D9488	2026-08-18 06:21:14.535+03
\.


--
-- TOC entry 5105 (class 0 OID 115225)
-- Dependencies: 230
-- Data for Name: sync_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sync_logs (id, device_hub_id, entity_name, entity_id, action, payload, synced_at) FROM stdin;
\.


--
-- TOC entry 5106 (class 0 OID 115234)
-- Dependencies: 231
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, full_name, role, avatar_url, created_at, updated_at, deleted_at) FROM stdin;
11111111-1111-4111-8111-111111111111	abebe.tadesse@temarlije.test	$2b$10$lhyvthUAtLyQCUyzzy828.eY3lGwTsC4nT0NvWt0vIOir3.Q7z7K6	Abebe Tadesse	TEACHER	\N	2026-08-18 06:21:14.277+03	2026-08-18 06:21:14.277+03	\N
22222222-2222-4222-8222-222222222222	sara.mekonnen@temarlije.test	$2b$10$lhyvthUAtLyQCUyzzy828.eY3lGwTsC4nT0NvWt0vIOir3.Q7z7K6	Sara Mekonnen	TEACHER	\N	2026-08-18 06:21:14.291+03	2026-08-18 06:21:14.291+03	\N
33333333-3333-4333-8333-333333333333	kebede.alemu@temarlije.test	$2b$10$lhyvthUAtLyQCUyzzy828.eY3lGwTsC4nT0NvWt0vIOir3.Q7z7K6	Kebede Alemu	STUDENT	\N	2026-08-18 06:21:14.299+03	2026-08-18 06:21:14.299+03	\N
44444444-4444-4444-8444-444444444444	hana.girma@temarlije.test	$2b$10$lhyvthUAtLyQCUyzzy828.eY3lGwTsC4nT0NvWt0vIOir3.Q7z7K6	Hana Girma	STUDENT	\N	2026-08-18 06:21:14.304+03	2026-08-18 06:21:14.304+03	\N
55555555-5555-4555-8555-555555555555	admin@temarlije.test	$2b$10$lhyvthUAtLyQCUyzzy828.eY3lGwTsC4nT0NvWt0vIOir3.Q7z7K6	Platform Admin	ADMIN	\N	2026-08-18 06:21:14.312+03	2026-08-18 06:21:14.312+03	\N
\.


--
-- TOC entry 4868 (class 2606 OID 115049)
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- TOC entry 4870 (class 2606 OID 115103)
-- Name: assignment_submissions assignment_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4874 (class 2606 OID 115114)
-- Name: assignments assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_pkey PRIMARY KEY (id);


--
-- TOC entry 4877 (class 2606 OID 115122)
-- Name: attendance_records attendance_records_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_pkey PRIMARY KEY (id);


--
-- TOC entry 4881 (class 2606 OID 115130)
-- Name: attendance_sessions attendance_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_pkey PRIMARY KEY (id);


--
-- TOC entry 4883 (class 2606 OID 115139)
-- Name: chat_messages chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_pkey PRIMARY KEY (id);


--
-- TOC entry 4887 (class 2606 OID 115146)
-- Name: classroom_members classroom_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_members
    ADD CONSTRAINT classroom_members_pkey PRIMARY KEY (id);


--
-- TOC entry 4891 (class 2606 OID 115154)
-- Name: classroom_teachers classroom_teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_teachers
    ADD CONSTRAINT classroom_teachers_pkey PRIMARY KEY (id);


--
-- TOC entry 4896 (class 2606 OID 115164)
-- Name: classrooms classrooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_pkey PRIMARY KEY (id);


--
-- TOC entry 4900 (class 2606 OID 115176)
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- TOC entry 4902 (class 2606 OID 115187)
-- Name: quiz_questions quiz_questions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_pkey PRIMARY KEY (id);


--
-- TOC entry 4905 (class 2606 OID 115198)
-- Name: quiz_submissions quiz_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_pkey PRIMARY KEY (id);


--
-- TOC entry 4908 (class 2606 OID 115210)
-- Name: quizzes quizzes_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_pkey PRIMARY KEY (id);


--
-- TOC entry 4911 (class 2606 OID 115217)
-- Name: study_group_members study_group_members_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_group_members
    ADD CONSTRAINT study_group_members_pkey PRIMARY KEY (id);


--
-- TOC entry 4914 (class 2606 OID 115224)
-- Name: study_groups study_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_pkey PRIMARY KEY (id);


--
-- TOC entry 4917 (class 2606 OID 115233)
-- Name: sync_logs sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sync_logs
    ADD CONSTRAINT sync_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 115244)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4894 (class 1259 OID 115256)
-- Name: classrooms_invite_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX classrooms_invite_code_key ON public.classrooms USING btree (invite_code);


--
-- TOC entry 4871 (class 1259 OID 115245)
-- Name: idx_assignment_submissions_latest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignment_submissions_latest ON public.assignment_submissions USING btree (assignment_id, student_id) WHERE (is_latest = true);


--
-- TOC entry 4875 (class 1259 OID 115247)
-- Name: idx_assignments_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_assignments_classroom ON public.assignments USING btree (classroom_id);


--
-- TOC entry 4878 (class 1259 OID 115248)
-- Name: idx_attendance_records_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_attendance_records_session ON public.attendance_records USING btree (session_id);


--
-- TOC entry 4884 (class 1259 OID 115250)
-- Name: idx_chat_messages_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_classroom ON public.chat_messages USING btree (classroom_id, created_at DESC);


--
-- TOC entry 4885 (class 1259 OID 115251)
-- Name: idx_chat_messages_group; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_messages_group ON public.chat_messages USING btree (study_group_id, created_at DESC);


--
-- TOC entry 4888 (class 1259 OID 115252)
-- Name: idx_classroom_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_members_user ON public.classroom_members USING btree (user_id);


--
-- TOC entry 4892 (class 1259 OID 115254)
-- Name: idx_classroom_teachers_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classroom_teachers_user ON public.classroom_teachers USING btree (user_id);


--
-- TOC entry 4897 (class 1259 OID 115257)
-- Name: idx_classrooms_invite_code; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_classrooms_invite_code ON public.classrooms USING btree (invite_code);


--
-- TOC entry 4898 (class 1259 OID 115258)
-- Name: idx_materials_classroom; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_materials_classroom ON public.materials USING btree (classroom_id);


--
-- TOC entry 4903 (class 1259 OID 115259)
-- Name: idx_quiz_submissions_latest; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quiz_submissions_latest ON public.quiz_submissions USING btree (quiz_id, student_id) WHERE (is_latest = true);


--
-- TOC entry 4909 (class 1259 OID 115261)
-- Name: idx_study_group_members_user; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_study_group_members_user ON public.study_group_members USING btree (user_id);


--
-- TOC entry 4915 (class 1259 OID 115263)
-- Name: idx_sync_logs_device; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sync_logs_device ON public.sync_logs USING btree (device_hub_id, synced_at);


--
-- TOC entry 4918 (class 1259 OID 115264)
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- TOC entry 4872 (class 1259 OID 115246)
-- Name: uq_assignment_attempt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_assignment_attempt ON public.assignment_submissions USING btree (assignment_id, student_id, attempt_number);


--
-- TOC entry 4889 (class 1259 OID 115253)
-- Name: uq_classroom_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_classroom_member ON public.classroom_members USING btree (classroom_id, user_id);


--
-- TOC entry 4893 (class 1259 OID 115255)
-- Name: uq_classroom_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_classroom_teacher ON public.classroom_teachers USING btree (classroom_id, user_id);


--
-- TOC entry 4912 (class 1259 OID 115262)
-- Name: uq_group_member; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_group_member ON public.study_group_members USING btree (study_group_id, user_id);


--
-- TOC entry 4906 (class 1259 OID 115260)
-- Name: uq_quiz_attempt; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_quiz_attempt ON public.quiz_submissions USING btree (quiz_id, student_id, attempt_number);


--
-- TOC entry 4879 (class 1259 OID 115249)
-- Name: uq_session_student; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX uq_session_student ON public.attendance_records USING btree (session_id, student_id);


--
-- TOC entry 4919 (class 1259 OID 115265)
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- TOC entry 4922 (class 2606 OID 115266)
-- Name: assignment_submissions assignment_submissions_assignment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;


--
-- TOC entry 4923 (class 2606 OID 115271)
-- Name: assignment_submissions assignment_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignment_submissions
    ADD CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4924 (class 2606 OID 115276)
-- Name: assignments assignments_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4925 (class 2606 OID 115281)
-- Name: assignments assignments_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.assignments
    ADD CONSTRAINT assignments_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4926 (class 2606 OID 115286)
-- Name: attendance_records attendance_records_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.attendance_sessions(id) ON DELETE CASCADE;


--
-- TOC entry 4927 (class 2606 OID 115291)
-- Name: attendance_records attendance_records_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_records
    ADD CONSTRAINT attendance_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4928 (class 2606 OID 115296)
-- Name: attendance_sessions attendance_sessions_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.attendance_sessions
    ADD CONSTRAINT attendance_sessions_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4929 (class 2606 OID 115301)
-- Name: chat_messages chat_messages_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4930 (class 2606 OID 115306)
-- Name: chat_messages chat_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4931 (class 2606 OID 115311)
-- Name: chat_messages chat_messages_study_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_messages
    ADD CONSTRAINT chat_messages_study_group_id_fkey FOREIGN KEY (study_group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- TOC entry 4932 (class 2606 OID 115316)
-- Name: classroom_members classroom_members_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_members
    ADD CONSTRAINT classroom_members_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4933 (class 2606 OID 115321)
-- Name: classroom_members classroom_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_members
    ADD CONSTRAINT classroom_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4934 (class 2606 OID 115326)
-- Name: classroom_teachers classroom_teachers_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_teachers
    ADD CONSTRAINT classroom_teachers_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4935 (class 2606 OID 115331)
-- Name: classroom_teachers classroom_teachers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_teachers
    ADD CONSTRAINT classroom_teachers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4936 (class 2606 OID 115336)
-- Name: classrooms classrooms_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT classrooms_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4937 (class 2606 OID 115341)
-- Name: materials materials_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4938 (class 2606 OID 115346)
-- Name: materials materials_uploaded_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_uploaded_by_id_fkey FOREIGN KEY (uploaded_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 4939 (class 2606 OID 115351)
-- Name: quiz_questions quiz_questions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_questions
    ADD CONSTRAINT quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- TOC entry 4940 (class 2606 OID 115356)
-- Name: quiz_submissions quiz_submissions_quiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;


--
-- TOC entry 4941 (class 2606 OID 115361)
-- Name: quiz_submissions quiz_submissions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quiz_submissions
    ADD CONSTRAINT quiz_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4942 (class 2606 OID 115366)
-- Name: quizzes quizzes_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quizzes
    ADD CONSTRAINT quizzes_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4943 (class 2606 OID 115371)
-- Name: study_group_members study_group_members_study_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_group_members
    ADD CONSTRAINT study_group_members_study_group_id_fkey FOREIGN KEY (study_group_id) REFERENCES public.study_groups(id) ON DELETE CASCADE;


--
-- TOC entry 4944 (class 2606 OID 115376)
-- Name: study_group_members study_group_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_group_members
    ADD CONSTRAINT study_group_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- TOC entry 4945 (class 2606 OID 115381)
-- Name: study_groups study_groups_classroom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id) ON DELETE CASCADE;


--
-- TOC entry 4946 (class 2606 OID 115386)
-- Name: study_groups study_groups_created_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.study_groups
    ADD CONSTRAINT study_groups_created_by_id_fkey FOREIGN KEY (created_by_id) REFERENCES public.users(id) ON DELETE RESTRICT;


--
-- TOC entry 5113 (class 0 OID 0)
-- Dependencies: 5
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


-- Completed on 2026-08-18 13:23:18

--
-- PostgreSQL database dump complete
--

\unrestrict N2ZPtVYeuUifnGRH7iihWqYQX9DxZagLIM6FLvMUMWgv2r1JGIWQS2pHEl9kB5P

