--
-- PostgreSQL database dump
--

\restrict kmMSlHXrPQolu1CTxuVbWAt1NboHyUpMydfbB0XRj9mYm9jtCpjo9GO5y8mE8VW

-- Dumped from database version 15.14 (Debian 15.14-1.pgdg13+1)
-- Dumped by pg_dump version 15.14 (Debian 15.14-1.pgdg13+1)

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
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: audit_trigger_function(); Type: FUNCTION; Schema: public; Owner: pguser
--

CREATE FUNCTION public.audit_trigger_function() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user_id INTEGER;
    v_record_id INTEGER;
    v_new_json JSONB;
    v_old_json JSONB;
BEGIN
    -- Use JSONB extraction to avoid referencing missing columns directly
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        v_new_json := to_json(NEW)::jsonb;
    ELSE
        v_new_json := NULL;
    END IF;
    IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
        v_old_json := to_json(OLD)::jsonb;
    ELSE
        v_old_json := NULL;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        v_user_id := COALESCE((v_new_json ->> 'updated_by')::INT, (v_new_json ->> 'user_id')::INT, 1);
        v_record_id := (v_new_json ->> 'id')::INT;
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, timestamp)
        VALUES (v_user_id, 'UPDATE', TG_TABLE_NAME, v_record_id, row_to_json(OLD), row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        v_user_id := COALESCE((v_new_json ->> 'created_by')::INT, (v_new_json ->> 'user_id')::INT, 1);
        v_record_id := (v_new_json ->> 'id')::INT;
        INSERT INTO audit_logs (user_id, action, table_name, record_id, new_data, timestamp)
        VALUES (v_user_id, 'INSERT', TG_TABLE_NAME, v_record_id, row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_user_id := COALESCE((v_old_json ->> 'user_id')::INT, 1);
        v_record_id := (v_old_json ->> 'id')::INT;
        INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, timestamp)
        VALUES (v_user_id, 'DELETE', TG_TABLE_NAME, v_record_id, row_to_json(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


ALTER FUNCTION public.audit_trigger_function() OWNER TO pguser;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_streams; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.activity_streams (
    id integer NOT NULL,
    user_id integer,
    project_id integer,
    task_id integer,
    activity_type character varying(50) NOT NULL,
    content text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_real_time boolean DEFAULT true,
    broadcast_to integer[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone DEFAULT (CURRENT_TIMESTAMP + '24:00:00'::interval)
);


ALTER TABLE public.activity_streams OWNER TO pguser;

--
-- Name: activity_streams_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.activity_streams_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.activity_streams_id_seq OWNER TO pguser;

--
-- Name: activity_streams_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.activity_streams_id_seq OWNED BY public.activity_streams.id;


--
-- Name: analytics_snapshots; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.analytics_snapshots (
    id integer NOT NULL,
    snapshot_type character varying(50) NOT NULL,
    metric_name character varying(100) NOT NULL,
    metric_value numeric(15,2),
    metric_unit character varying(20),
    aggregation_method character varying(20),
    time_period_start timestamp without time zone NOT NULL,
    time_period_end timestamp without time zone NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.analytics_snapshots OWNER TO pguser;

--
-- Name: analytics_snapshots_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.analytics_snapshots_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.analytics_snapshots_id_seq OWNER TO pguser;

--
-- Name: analytics_snapshots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.analytics_snapshots_id_seq OWNED BY public.analytics_snapshots.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    key_name character varying(100) NOT NULL,
    api_key character varying(255) NOT NULL,
    api_secret character varying(255),
    user_id integer,
    permissions jsonb DEFAULT '{}'::jsonb,
    rate_limit_per_hour integer DEFAULT 1000,
    rate_limit_per_day integer DEFAULT 10000,
    is_active boolean DEFAULT true,
    last_used_at timestamp without time zone,
    usage_count integer DEFAULT 0,
    trust_score integer DEFAULT 50,
    expires_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.api_keys OWNER TO pguser;

--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.api_keys_id_seq OWNER TO pguser;

--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    action character varying(100) NOT NULL,
    table_name character varying(50) NOT NULL,
    record_id integer,
    old_data jsonb,
    new_data jsonb,
    ip_address inet,
    user_agent text,
    session_id character varying(255),
    "timestamp" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    metadata jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.audit_logs OWNER TO pguser;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.audit_logs_id_seq OWNER TO pguser;

--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: backups; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.backups (
    id integer NOT NULL,
    backup_name character varying(255) NOT NULL,
    backup_type character varying(50) NOT NULL,
    file_path text NOT NULL,
    file_size_bytes bigint,
    compression_type character varying(20) DEFAULT 'gzip'::character varying,
    checksum_md5 character varying(32),
    checksum_sha256 character varying(64),
    tables_included jsonb DEFAULT '[]'::jsonb,
    backup_status character varying(20) DEFAULT 'completed'::character varying,
    created_by integer,
    restore_count integer DEFAULT 0,
    last_restored_at timestamp without time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.backups OWNER TO pguser;

--
-- Name: backups_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.backups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.backups_id_seq OWNER TO pguser;

--
-- Name: backups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.backups_id_seq OWNED BY public.backups.id;


--
-- Name: buckets; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.buckets (
    id text NOT NULL,
    name text NOT NULL,
    path text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    encryption text,
    versioning boolean DEFAULT false
);


ALTER TABLE public.buckets OWNER TO pguser;

--
-- Name: comments; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.comments (
    id integer NOT NULL,
    user_id integer,
    target_type character varying(40),
    target_id integer,
    content text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.comments OWNER TO pguser;

--
-- Name: comments_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.comments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.comments_id_seq OWNER TO pguser;

--
-- Name: comments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.comments_id_seq OWNED BY public.comments.id;


--
-- Name: files; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.files (
    id text NOT NULL,
    original_name text NOT NULL,
    file_path text NOT NULL,
    mime_type text,
    checksum text,
    size integer,
    bucket_id text,
    user_id integer,
    shared boolean DEFAULT false,
    share_link text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.files OWNER TO pguser;

--
-- Name: memberships; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.memberships (
    id integer NOT NULL,
    organization_id integer,
    user_id integer,
    role character varying(40) DEFAULT 'member'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.memberships OWNER TO pguser;

--
-- Name: memberships_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.memberships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.memberships_id_seq OWNER TO pguser;

--
-- Name: memberships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.memberships_id_seq OWNED BY public.memberships.id;


--
-- Name: migrations_applied; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.migrations_applied (
    id integer NOT NULL,
    migration_name character varying(255) NOT NULL,
    applied_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    checksum character varying(128)
);


ALTER TABLE public.migrations_applied OWNER TO pguser;

--
-- Name: migrations_applied_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.migrations_applied_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.migrations_applied_id_seq OWNER TO pguser;

--
-- Name: migrations_applied_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.migrations_applied_id_seq OWNED BY public.migrations_applied.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer,
    message text,
    is_read boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.notifications OWNER TO pguser;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.notifications_id_seq OWNER TO pguser;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name text NOT NULL,
    owner_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.organizations OWNER TO pguser;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.organizations_id_seq OWNER TO pguser;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: projects; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.projects (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.projects OWNER TO pguser;

--
-- Name: projects_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.projects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.projects_id_seq OWNER TO pguser;

--
-- Name: projects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.projects_id_seq OWNED BY public.projects.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.sessions (
    id integer NOT NULL,
    session_id character varying(255) NOT NULL,
    user_id integer,
    jwt_token text,
    refresh_token character varying(255),
    ip_address inet,
    user_agent text,
    is_active boolean DEFAULT true,
    last_activity timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamp without time zone,
    device_info jsonb DEFAULT '{}'::jsonb,
    location_info jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.sessions OWNER TO pguser;

--
-- Name: sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.sessions_id_seq OWNER TO pguser;

--
-- Name: sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.sessions_id_seq OWNED BY public.sessions.id;


--
-- Name: share_tokens; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.share_tokens (
    token text NOT NULL,
    bucket_id text,
    file_id text,
    expires_at timestamp without time zone,
    max_downloads integer,
    download_count integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.share_tokens OWNER TO pguser;

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.tasks (
    id integer NOT NULL,
    project_id integer,
    title text NOT NULL,
    status character varying(30) DEFAULT 'open'::character varying,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.tasks OWNER TO pguser;

--
-- Name: system_metrics_realtime; Type: VIEW; Schema: public; Owner: pguser
--

CREATE VIEW public.system_metrics_realtime AS
 SELECT 'active_users'::text AS metric_name,
    count(DISTINCT sessions.user_id) AS metric_value,
    'count'::text AS metric_unit,
    CURRENT_TIMESTAMP AS "timestamp"
   FROM public.sessions
  WHERE ((sessions.is_active = true) AND (sessions.last_activity > (CURRENT_TIMESTAMP - '00:05:00'::interval)))
UNION ALL
 SELECT 'total_projects'::text AS metric_name,
    count(*) AS metric_value,
    'count'::text AS metric_unit,
    CURRENT_TIMESTAMP AS "timestamp"
   FROM public.projects
UNION ALL
 SELECT 'active_tasks'::text AS metric_name,
    count(*) AS metric_value,
    'count'::text AS metric_unit,
    CURRENT_TIMESTAMP AS "timestamp"
   FROM public.tasks
  WHERE ((tasks.status)::text <> 'completed'::text)
UNION ALL
 SELECT 'api_calls_last_hour'::text AS metric_name,
    count(*) AS metric_value,
    'count'::text AS metric_unit,
    CURRENT_TIMESTAMP AS "timestamp"
   FROM public.audit_logs
  WHERE ((audit_logs."timestamp" > (CURRENT_TIMESTAMP - '01:00:00'::interval)) AND ((audit_logs.action)::text ~~ 'API_%'::text));


ALTER TABLE public.system_metrics_realtime OWNER TO pguser;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.system_settings (
    id integer NOT NULL,
    setting_key character varying(100) NOT NULL,
    setting_value text,
    setting_type character varying(20) DEFAULT 'string'::character varying,
    category character varying(50) DEFAULT 'general'::character varying,
    description text,
    is_encrypted boolean DEFAULT false,
    requires_restart boolean DEFAULT false,
    last_modified_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.system_settings OWNER TO pguser;

--
-- Name: system_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.system_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.system_settings_id_seq OWNER TO pguser;

--
-- Name: system_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.system_settings_id_seq OWNED BY public.system_settings.id;


--
-- Name: tasks_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.tasks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.tasks_id_seq OWNER TO pguser;

--
-- Name: tasks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.tasks_id_seq OWNED BY public.tasks.id;


--
-- Name: test_table; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.test_table (
    id integer NOT NULL,
    name text
);


ALTER TABLE public.test_table OWNER TO pguser;

--
-- Name: test_table_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.test_table_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.test_table_id_seq OWNER TO pguser;

--
-- Name: test_table_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.test_table_id_seq OWNED BY public.test_table.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: pguser
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email text NOT NULL,
    name text,
    password text,
    role character varying(30) DEFAULT 'user'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by integer,
    updated_by integer,
    user_id integer,
    username text,
    password_hash text
);


ALTER TABLE public.users OWNER TO pguser;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: pguser
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE public.users_id_seq OWNER TO pguser;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: pguser
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: activity_streams id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.activity_streams ALTER COLUMN id SET DEFAULT nextval('public.activity_streams_id_seq'::regclass);


--
-- Name: analytics_snapshots id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.analytics_snapshots ALTER COLUMN id SET DEFAULT nextval('public.analytics_snapshots_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: backups id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.backups ALTER COLUMN id SET DEFAULT nextval('public.backups_id_seq'::regclass);


--
-- Name: comments id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.comments ALTER COLUMN id SET DEFAULT nextval('public.comments_id_seq'::regclass);


--
-- Name: memberships id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.memberships ALTER COLUMN id SET DEFAULT nextval('public.memberships_id_seq'::regclass);


--
-- Name: migrations_applied id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.migrations_applied ALTER COLUMN id SET DEFAULT nextval('public.migrations_applied_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: projects id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.projects ALTER COLUMN id SET DEFAULT nextval('public.projects_id_seq'::regclass);


--
-- Name: sessions id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.sessions ALTER COLUMN id SET DEFAULT nextval('public.sessions_id_seq'::regclass);


--
-- Name: system_settings id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.system_settings ALTER COLUMN id SET DEFAULT nextval('public.system_settings_id_seq'::regclass);


--
-- Name: tasks id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.tasks ALTER COLUMN id SET DEFAULT nextval('public.tasks_id_seq'::regclass);


--
-- Name: test_table id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.test_table ALTER COLUMN id SET DEFAULT nextval('public.test_table_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: activity_streams; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.activity_streams (id, user_id, project_id, task_id, activity_type, content, metadata, is_real_time, broadcast_to, created_at, expires_at) FROM stdin;
\.


--
-- Data for Name: analytics_snapshots; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.analytics_snapshots (id, snapshot_type, metric_name, metric_value, metric_unit, aggregation_method, time_period_start, time_period_end, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.api_keys (id, key_name, api_key, api_secret, user_id, permissions, rate_limit_per_hour, rate_limit_per_day, is_active, last_used_at, usage_count, trust_score, expires_at, created_at) FROM stdin;
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.audit_logs (id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, session_id, "timestamp", metadata) FROM stdin;
1	1	UPDATE	users	1	{"id": 1, "name": "Admin", "role": "admin", "email": "admin@localhost", "user_id": null, "password": "$2a$06$0zakRHlq5FFRnZC2ROU.NOfKCw3QeozeUqubMmTJwEGaIFreWZQJO", "is_active": true, "created_at": "2025-10-29T01:29:50.463224", "created_by": null, "updated_by": null}	{"id": 1, "name": "Admin", "role": "admin", "email": "admin@localhost", "user_id": null, "password": "$2a$06$qazmPV5Lj85XgRcyjSXeAudEYyU8JHrHjBZJLhgbU.gWQrdsjxztG", "is_active": true, "created_at": "2025-10-29T01:29:50.463224", "created_by": null, "updated_by": null}	\N	\N	\N	2025-10-29 02:26:04.825722	{}
2	1	UPDATE	users	1	{"id": 1, "name": "Admin", "role": "admin", "email": "admin@localhost", "user_id": null, "password": "$2a$06$qazmPV5Lj85XgRcyjSXeAudEYyU8JHrHjBZJLhgbU.gWQrdsjxztG", "is_active": true, "created_at": "2025-10-29T01:29:50.463224", "created_by": null, "updated_by": null}	{"id": 1, "name": "Admin", "role": "admin", "email": "admin@localhost", "user_id": null, "password": "$2a$06$/P2Aqns4KwV3LC6ywIWK4.D0Lr48Xjt6xmj0lumcJFBb8yaEZKvS.", "is_active": true, "created_at": "2025-10-29T01:29:50.463224", "created_by": null, "updated_by": null}	\N	\N	\N	2025-10-29 03:19:36.120547	{}
3	1	UPDATE	users	1	{"id": 1, "name": "Admin", "role": "admin", "email": "admin@localhost", "user_id": null, "password": "$2a$06$/P2Aqns4KwV3LC6ywIWK4.D0Lr48Xjt6xmj0lumcJFBb8yaEZKvS.", "is_active": true, "created_at": "2025-10-29T01:29:50.463224", "created_by": null, "updated_by": null}	{"id": 1, "name": "Admin", "role": "admin", "email": "admin@localhost", "user_id": null, "password": "$2a$06$lq9Fn/S4Eg9c5HeLanPZjO2xfMIYqQSaV27ZBQLtDojM02b/Vz3YG", "is_active": true, "created_at": "2025-10-29T01:29:50.463224", "created_by": null, "updated_by": null}	\N	\N	\N	2025-10-29 03:23:32.307852	{}
\.


--
-- Data for Name: backups; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.backups (id, backup_name, backup_type, file_path, file_size_bytes, compression_type, checksum_md5, checksum_sha256, tables_included, backup_status, created_by, restore_count, last_restored_at, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.buckets (id, name, path, created_at, encryption, versioning) FROM stdin;
\.


--
-- Data for Name: comments; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.comments (id, user_id, target_type, target_id, content, created_at) FROM stdin;
\.


--
-- Data for Name: files; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.files (id, original_name, file_path, mime_type, checksum, size, bucket_id, user_id, shared, share_link, created_at) FROM stdin;
\.


--
-- Data for Name: memberships; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.memberships (id, organization_id, user_id, role, created_at) FROM stdin;
\.


--
-- Data for Name: migrations_applied; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.migrations_applied (id, migration_name, applied_at, checksum) FROM stdin;
1	001-create-core-tables.sql	2025-10-28 18:40:39.904844	41995d08ca4a6fdfa276272a9de7856f1d1230ce697e66520aa46637b1c88384
2	001-create-core-tables	2025-10-28 18:40:39.932365	\N
3	002-create-migrations-applied.sql	2025-10-28 18:40:39.94305	394cdd62600c4421cae205367e4c9ce11a30bed38398c23c6b1b38e83364ae2f
4	002-test-table.sql	2025-10-28 18:40:39.997289	3e6c9784492aa395c6b0b12aeb3195c53a8b8e47c30ae9ac5771f113915e6b7f
5	003-audit-logs-fk-on-delete-set-null	2025-10-28 18:40:40.030527	\N
6	003-audit-logs-fk-on-delete-set-null.sql	2025-10-28 18:40:40.058007	72825f851c5a9124eb6b66cc9ef4cae4871160d97ef81217055dc6c7c7638312
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.notifications (id, user_id, message, is_read, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.organizations (id, name, owner_id, created_at) FROM stdin;
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.projects (id, name, description, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.sessions (id, session_id, user_id, jwt_token, refresh_token, ip_address, user_agent, is_active, last_activity, expires_at, device_info, location_info, created_at) FROM stdin;
\.


--
-- Data for Name: share_tokens; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.share_tokens (token, bucket_id, file_id, expires_at, max_downloads, download_count, active, created_at) FROM stdin;
\.


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.system_settings (id, setting_key, setting_value, setting_type, category, description, is_encrypted, requires_restart, last_modified_by, created_at, updated_at) FROM stdin;
1	max_concurrent_connections	500	number	database	Maximum concurrent database connections	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
2	connection_pool_size	100	number	database	Database connection pool size	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
3	session_timeout_minutes	60	number	security	User session timeout in minutes	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
4	api_rate_limit_per_hour	1000	number	api	Default API rate limit per hour	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
5	backup_retention_days	30	number	backup	Days to retain backup files	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
6	auto_backup_enabled	true	boolean	backup	Enable automatic daily backups	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
7	real_time_notifications	true	boolean	features	Enable real-time notifications	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
8	audit_log_retention_days	90	number	security	Days to retain audit logs	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
9	encryption_enabled	true	boolean	security	Enable data encryption at rest	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
10	websocket_enabled	true	boolean	features	Enable WebSocket for real-time features	f	f	\N	2025-10-29 01:42:09.221984	2025-10-29 01:42:09.221984
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.tasks (id, project_id, title, status, assigned_to, created_at) FROM stdin;
\.


--
-- Data for Name: test_table; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.test_table (id, name) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: pguser
--

COPY public.users (id, email, name, password, role, is_active, created_at, created_by, updated_by, user_id, username, password_hash) FROM stdin;
1	admin@localhost	Admin	$2a$06$lq9Fn/S4Eg9c5HeLanPZjO2xfMIYqQSaV27ZBQLtDojM02b/Vz3YG	admin	t	2025-10-29 01:29:50.463224	\N	\N	\N	\N	\N
\.


--
-- Name: activity_streams_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.activity_streams_id_seq', 1, false);


--
-- Name: analytics_snapshots_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.analytics_snapshots_id_seq', 1, false);


--
-- Name: api_keys_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.api_keys_id_seq', 1, false);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.audit_logs_id_seq', 3, true);


--
-- Name: backups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.backups_id_seq', 1, false);


--
-- Name: comments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.comments_id_seq', 1, false);


--
-- Name: memberships_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.memberships_id_seq', 1, false);


--
-- Name: migrations_applied_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.migrations_applied_id_seq', 6, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.notifications_id_seq', 1, false);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.organizations_id_seq', 1, false);


--
-- Name: projects_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.projects_id_seq', 1, false);


--
-- Name: sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.sessions_id_seq', 1, false);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 10, true);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.tasks_id_seq', 1, false);


--
-- Name: test_table_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.test_table_id_seq', 1, false);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: pguser
--

SELECT pg_catalog.setval('public.users_id_seq', 1, true);


--
-- Name: activity_streams activity_streams_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.activity_streams
    ADD CONSTRAINT activity_streams_pkey PRIMARY KEY (id);


--
-- Name: analytics_snapshots analytics_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.analytics_snapshots
    ADD CONSTRAINT analytics_snapshots_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_api_key_key; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_api_key_key UNIQUE (api_key);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: backups backups_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_pkey PRIMARY KEY (id);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- Name: files files_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_pkey PRIMARY KEY (id);


--
-- Name: memberships memberships_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_pkey PRIMARY KEY (id);


--
-- Name: migrations_applied migrations_applied_migration_name_key; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.migrations_applied
    ADD CONSTRAINT migrations_applied_migration_name_key UNIQUE (migration_name);


--
-- Name: migrations_applied migrations_applied_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.migrations_applied
    ADD CONSTRAINT migrations_applied_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_session_id_key UNIQUE (session_id);


--
-- Name: share_tokens share_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT share_tokens_pkey PRIMARY KEY (token);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_setting_key_key; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_setting_key_key UNIQUE (setting_key);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: test_table test_table_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.test_table
    ADD CONSTRAINT test_table_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_streams_created_at; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_activity_streams_created_at ON public.activity_streams USING btree (created_at);


--
-- Name: idx_activity_streams_project_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_activity_streams_project_id ON public.activity_streams USING btree (project_id);


--
-- Name: idx_activity_streams_type; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_activity_streams_type ON public.activity_streams USING btree (activity_type);


--
-- Name: idx_activity_streams_user_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_activity_streams_user_id ON public.activity_streams USING btree (user_id);


--
-- Name: idx_analytics_snapshots_metric; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_analytics_snapshots_metric ON public.analytics_snapshots USING btree (metric_name);


--
-- Name: idx_analytics_snapshots_period; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_analytics_snapshots_period ON public.analytics_snapshots USING btree (time_period_start, time_period_end);


--
-- Name: idx_analytics_snapshots_type; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_analytics_snapshots_type ON public.analytics_snapshots USING btree (snapshot_type);


--
-- Name: idx_api_keys_active; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_api_keys_active ON public.api_keys USING btree (is_active);


--
-- Name: idx_api_keys_key; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_api_keys_key ON public.api_keys USING btree (api_key);


--
-- Name: idx_api_keys_user_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_api_keys_user_id ON public.api_keys USING btree (user_id);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_table_name; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_audit_logs_table_name ON public.audit_logs USING btree (table_name);


--
-- Name: idx_audit_logs_timestamp; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_audit_logs_timestamp ON public.audit_logs USING btree ("timestamp");


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_backups_created_at; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_backups_created_at ON public.backups USING btree (created_at);


--
-- Name: idx_backups_status; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_backups_status ON public.backups USING btree (backup_status);


--
-- Name: idx_backups_type; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_backups_type ON public.backups USING btree (backup_type);


--
-- Name: idx_files_bucket_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_files_bucket_id ON public.files USING btree (bucket_id);


--
-- Name: idx_files_user_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_files_user_id ON public.files USING btree (user_id);


--
-- Name: idx_sessions_active; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_sessions_active ON public.sessions USING btree (is_active);


--
-- Name: idx_sessions_last_activity; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_sessions_last_activity ON public.sessions USING btree (last_activity);


--
-- Name: idx_sessions_session_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_sessions_session_id ON public.sessions USING btree (session_id);


--
-- Name: idx_sessions_user_id; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_sessions_user_id ON public.sessions USING btree (user_id);


--
-- Name: idx_system_settings_category; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_system_settings_category ON public.system_settings USING btree (category);


--
-- Name: idx_system_settings_key; Type: INDEX; Schema: public; Owner: pguser
--

CREATE INDEX idx_system_settings_key ON public.system_settings USING btree (setting_key);


--
-- Name: projects audit_projects_trigger; Type: TRIGGER; Schema: public; Owner: pguser
--

CREATE TRIGGER audit_projects_trigger AFTER INSERT OR DELETE OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: tasks audit_tasks_trigger; Type: TRIGGER; Schema: public; Owner: pguser
--

CREATE TRIGGER audit_tasks_trigger AFTER INSERT OR DELETE OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: users audit_users_trigger; Type: TRIGGER; Schema: public; Owner: pguser
--

CREATE TRIGGER audit_users_trigger AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();


--
-- Name: activity_streams activity_streams_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.activity_streams
    ADD CONSTRAINT activity_streams_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: activity_streams activity_streams_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.activity_streams
    ADD CONSTRAINT activity_streams_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.tasks(id);


--
-- Name: activity_streams activity_streams_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.activity_streams
    ADD CONSTRAINT activity_streams_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: api_keys api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: backups backups_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.backups
    ADD CONSTRAINT backups_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: comments comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: files files_bucket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES public.buckets(id);


--
-- Name: files files_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.files
    ADD CONSTRAINT files_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: memberships memberships_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: memberships memberships_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.memberships
    ADD CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: organizations organizations_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: share_tokens share_tokens_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.share_tokens
    ADD CONSTRAINT share_tokens_file_id_fkey FOREIGN KEY (file_id) REFERENCES public.files(id);


--
-- Name: system_settings system_settings_last_modified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: pguser
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- PostgreSQL database dump complete
--

\unrestrict kmMSlHXrPQolu1CTxuVbWAt1NboHyUpMydfbB0XRj9mYm9jtCpjo9GO5y8mE8VW

